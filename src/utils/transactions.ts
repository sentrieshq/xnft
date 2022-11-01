import {
  ConfirmOptions,
  Connection,
  SendTransactionError,
  Signer,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { sendAndConfirmRawTransaction, Keypair } from "@solana/web3.js";
import { SentryData } from "../typings/tokenMetadata";
import {
  STAKE_ENTRY_SEED,
  STAKE_POOL_ID,
  TOKEN_MANAGER_ADDRESS,
  TOKEN_MANAGER_SEED,
} from "./constants";
import { iWallet } from "./wallet";
import { PublicKey } from "@solana/web3.js";
import type { Wallet } from "@saberhq/solana-contrib";
import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import * as metaplex from "@metaplex-foundation/mpl-token-metadata";
import { SignerWallet } from "@saberhq/solana-contrib";
import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
  BN,
  utils,
} from "@project-serum/anchor";
import {
  claimReceiptMint,
  mStake,
  STAKE_POOL_ADDRESS,
} from "../utils/instruction";
import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { AccountData } from "@cardinal/common";

import * as STAKE_POOL_TYPES from "../idl/cardinal_stake_pool";

export const STAKE_POOL_IDL = STAKE_POOL_TYPES.IDL;
export const STAKE_AUTHORIZATION_SEED = "stake-authorization";

export type STAKE_POOL_PROGRAM = STAKE_POOL_TYPES.CardinalStakePool;

export type StakePoolTypes = AnchorTypes<STAKE_POOL_PROGRAM>;
type Accounts = StakePoolTypes["Accounts"];
export type StakeEntryData = Accounts["stakeEntry"];
export type StakePoolData = Accounts["stakePool"];

export type ParsedTokenAccountData = {
  isNative: boolean;
  delegate: string;
  mint: string;
  owner: string;
  state: "initialized" | "frozen";
  tokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
  };
};

export type BaseTokenData = {
  tokenAccount?: AccountData<ParsedTokenAccountData>;
  metaplexData?: AccountData<metaplex.MetadataData>;
};

export type AllowedTokenData = BaseTokenData & {
  metadata?: AccountData<any> | null;
  stakeEntry?: AccountData<StakeEntryData> | null;
};

type AccountFn<T> = () => Promise<AccountData<T>>;

enum ReceiptType {
  // Receive the original mint wrapped in a token manager
  Original = 1,
  // Receive a receipt mint wrapped in a token manager
  Receipt = 2,
  // Receive nothing
  None = 3,
}

/**
 * Get total supply of mint
 * @param connection
 * @param originalMintId
 * @returns
 */
const getMintSupply = async (
  connection: web3.Connection,
  originalMintId: web3.PublicKey
): Promise<BN> => {
  const mint = new splToken.Token(
    connection,
    originalMintId,
    splToken.TOKEN_PROGRAM_ID,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    null
  );
  return (await mint.getMintInfo()).supply;
};

/**
 * Tries to get account based on function fn
 * Return null if account doesn't exist
 * @param fn
 * @returns
 */
async function tryGetAccount<T>(fn: AccountFn<T>) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

const getProgram = (connection: Connection) => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  return new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );
};

const getStakeEntry = async (
  connection: Connection,
  stakeEntryId: PublicKey
): Promise<AccountData<StakeEntryData>> => {
  const stakePoolProgram = getProgram(connection);

  const parsed = await stakePoolProgram.account.stakeEntry.fetch(stakeEntryId);
  return {
    parsed,
    pubkey: stakeEntryId,
  };
};

/**
 * Convenience call to create a stake entry
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param stakePoolId - Stake pool ID
 * @param originalMintId - Original mint ID
 * @param user - (Optional) User pubkey in case the person paying for the transaction and
 * stake entry owner are different
 * @returns
 */
const createStakeEntry = async (
  connection: Connection,
  wallet: Wallet,
  params: {
    stakePoolId: PublicKey;
    originalMintId: PublicKey;
  }
): Promise<[Transaction, PublicKey]> => {
  return withInitStakeEntry(new Transaction(), connection, wallet, {
    stakePoolId: params.stakePoolId,
    originalMintId: params.originalMintId,
  });
};

/**
 * Convenience method to find the stake entry id.
 * @returns
 */
const findStakeEntryId = async (
  wallet: web3.PublicKey,
  stakePoolId: web3.PublicKey,
  originalMintId: web3.PublicKey,
  isFungible: boolean
): Promise<[web3.PublicKey, number]> => {
  return web3.PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode(STAKE_ENTRY_SEED),
      stakePoolId.toBuffer(),
      originalMintId.toBuffer(),
      isFungible ? wallet.toBuffer() : web3.PublicKey.default.toBuffer(),
    ],
    STAKE_POOL_ADDRESS
  );
};

/**
 * Convenience method to find the stake entry id from a mint
 * NOTE: This will lookup the mint on-chain to get the supply
 * @returns
 */
const findStakeEntryIdFromMint = async (
  connection: web3.Connection,
  wallet: web3.PublicKey,
  stakePoolId: web3.PublicKey,
  originalMintId: web3.PublicKey,
  isFungible?: boolean
): Promise<[web3.PublicKey, number]> => {
  if (isFungible === undefined) {
    const supply = await getMintSupply(connection, originalMintId);
    isFungible = supply.gt(new BN(1));
  }
  return findStakeEntryId(wallet, stakePoolId, originalMintId, !isFungible);
};

/**
 * Add init stake entry instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction, public key for the created stake entry
 */
const withInitStakeEntry = async (
  transaction: web3.Transaction,
  connection: web3.Connection,
  wallet: Wallet,
  params: {
    stakePoolId: web3.PublicKey;
    originalMintId: web3.PublicKey;
  }
): Promise<[web3.Transaction, web3.PublicKey]> => {
  const [[stakeEntryId], originalMintMetadatId] = await Promise.all([
    findStakeEntryIdFromMint(
      connection,
      wallet.publicKey,
      params.stakePoolId,
      params.originalMintId
    ),
    metaplex.Metadata.getPDA(params.originalMintId),
  ]);

  transaction.add(
    await initStakeEntry(connection, wallet, {
      stakePoolId: params.stakePoolId,
      stakeEntryId: stakeEntryId,
      originalMintId: params.originalMintId,
      originalMintMetadatId: originalMintMetadatId,
    })
  );
  return [transaction, stakeEntryId];
};

const remainingAccountsForInitStakeEntry = async (
  stakePoolId: web3.PublicKey,
  originalMintId: web3.PublicKey
): Promise<web3.AccountMeta[]> => {
  const [stakeAuthorizationRecordId] = await findStakeAuthorizationId(
    stakePoolId,
    originalMintId
  );
  return [
    {
      pubkey: stakeAuthorizationRecordId,
      isSigner: false,
      isWritable: false,
    },
  ];
};

/**
 * Find stake authorization id.
 * @returns
 */
const findStakeAuthorizationId = async (
  stakePoolId: web3.PublicKey,
  mintId: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return web3.PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode(STAKE_AUTHORIZATION_SEED),
      stakePoolId.toBuffer(),
      mintId.toBuffer(),
    ],
    STAKE_POOL_ADDRESS
  );
};

const initStakeEntry = async (
  connection: Connection,
  wallet: Wallet,
  params: {
    stakePoolId: PublicKey;
    stakeEntryId: PublicKey;
    originalMintId: PublicKey;
    originalMintMetadatId: PublicKey;
  }
): Promise<TransactionInstruction> => {
  const provider = new AnchorProvider(connection, wallet, {});
  const stakePoolProgram = new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );
  const remainingAccounts = await remainingAccountsForInitStakeEntry(
    params.stakePoolId,
    params.originalMintId
  );
  return stakePoolProgram.instruction.initEntry(wallet.publicKey, {
    accounts: {
      stakeEntry: params.stakeEntryId,
      stakePool: params.stakePoolId,
      originalMint: params.originalMintId,
      originalMintMetadata: params.originalMintMetadatId,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    },
    remainingAccounts,
  });
};

/**
 * Finds the token manager address for a given mint and mint counter
 * @returns
 */
const findTokenManagerAddress = async (
  mint: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(TOKEN_MANAGER_SEED), mint.toBuffer()],
    TOKEN_MANAGER_ADDRESS
  );
};

/**
 * Utility function for adding a find or init associated token account instruction to a transaction
 * Useful when using associated token accounts so you can be sure they are created before hand
 * @param transaction
 * @param connection
 * @param mint
 * @param owner
 * @param payer
 * @param allowOwnerOffCurve
 * @returns The associated token account ID that was found or will be created. This also adds the relevent instruction to create it to the transaction if not found
 */
async function withFindOrInitAssociatedTokenAccount(
  transaction: web3.Transaction,
  connection: web3.Connection,
  mint: web3.PublicKey,
  owner: web3.PublicKey,
  payer: web3.PublicKey,
  allowOwnerOffCurve?: boolean
): Promise<web3.PublicKey> {
  const associatedAddress = await splToken.Token.getAssociatedTokenAddress(
    splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
    splToken.TOKEN_PROGRAM_ID,
    mint,
    owner,
    allowOwnerOffCurve
  );
  const account = await connection.getAccountInfo(associatedAddress);
  if (!account) {
    transaction.add(
      splToken.Token.createAssociatedTokenAccountInstruction(
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        splToken.TOKEN_PROGRAM_ID,
        mint,
        associatedAddress,
        owner,
        payer
      )
    );
  }
  return associatedAddress;
}

/**
 * Add stake instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction
 */
const withStake = async (
  transaction: web3.Transaction,
  connection: web3.Connection,
  wallet: Wallet,
  params: {
    stakePoolId: web3.PublicKey;
    originalMintId: web3.PublicKey;
    userOriginalMintTokenAccountId: web3.PublicKey;
    amount?: BN;
  }
): Promise<web3.Transaction> => {
  const [stakeEntryId] = await findStakeEntryIdFromMint(
    connection,
    wallet.publicKey,
    params.stakePoolId,
    params.originalMintId
  );
  const stakeEntryOriginalMintTokenAccountId =
    await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      params.originalMintId,
      stakeEntryId,
      wallet.publicKey,
      true
    );

  transaction.add(
    mStake(connection, wallet, {
      stakeEntryId: stakeEntryId,
      stakePoolId: params.stakePoolId,
      originalMint: params.originalMintId,
      stakeEntryOriginalMintTokenAccountId:
        stakeEntryOriginalMintTokenAccountId,
      userOriginalMintTokenAccountId: params.userOriginalMintTokenAccountId,
      amount: params.amount || new BN(1),
    })
  );

  return transaction;
};
/**
 * Add claim receipt mint instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param params
 * @returns Transaction
 */
const withClaimReceiptMint = async (
  transaction: web3.Transaction,
  connection: web3.Connection,
  wallet: Wallet,
  params: {
    stakePoolId: web3.PublicKey;
    stakeEntryId: web3.PublicKey;
    originalMintId: web3.PublicKey;
    receiptMintId: web3.PublicKey;
    receiptType: ReceiptType;
  }
): Promise<web3.Transaction> => {
  if (
    params.receiptType === ReceiptType.Original &&
    (await getMintSupply(connection, params.receiptMintId)).gt(new BN(1))
  ) {
    throw new Error(
      "Fungible staking and locked reecipt type not supported yet"
    );
  }

  const tokenManagerReceiptMintTokenAccountId =
    await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      params.receiptMintId,
      (
        await findTokenManagerAddress(params.receiptMintId)
      )[0],
      wallet.publicKey,
      true
    );

  transaction.add(
    await claimReceiptMint(connection, wallet, {
      stakeEntryId: params.stakeEntryId,
      tokenManagerReceiptMintTokenAccountId:
        tokenManagerReceiptMintTokenAccountId,
      originalMintId: params.originalMintId,
      receiptMintId: params.receiptMintId,
      receiptType: params.receiptType,
    })
  );
  return transaction;
};

/**
 * Convenience method to stake tokens
 * @param connection - Connection to use
 * @param wallet - Wallet to use
 * @param stakePoolId - Stake pool id
 * @param originalMintId - Original mint id
 * @param userOriginalMintTokenAccountId - User's original mint token account id
 * @param receiptType - (Optional) ReceiptType to be received back. If none provided, none will be claimed
 * @param user - (Optional) User pubkey in case the person paying for the transaction and
 * stake entry owner are different
 * @param amount - (Optional) Amount of tokens to be staked, defaults to 1
 * @returns
 */
const stake = async (
  connection: Connection,
  wallet: ReturnType<typeof iWallet>,
  params: {
    stakePoolId: PublicKey;
    originalMintId: PublicKey;
    userOriginalMintTokenAccountId: PublicKey;
    receiptType?: ReceiptType;
    amount?: BN;
  }
): Promise<Transaction> => {
  let transaction = new Transaction();
  const [stakeEntryId] = await web3.PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode(STAKE_ENTRY_SEED),
      params.stakePoolId.toBuffer(),
      params.originalMintId.toBuffer(),
      wallet.publicKey!.toBuffer(),
    ],
    STAKE_POOL_ADDRESS
  );
  //console.log('stake entry:', stakeEntryId)
  const stakeEntryData = await tryGetAccount(() =>
    getStakeEntry(connection, stakeEntryId)
  );

  //console.log('stake entry data:', stakeEntryData)
  if (!stakeEntryData) {
    [transaction] = await createStakeEntry(connection, wallet, {
      stakePoolId: params.stakePoolId,
      originalMintId: params.originalMintId,
    });
  }
  //console.log('transaction:', transaction)
  await withStake(transaction, connection, wallet, {
    stakePoolId: params.stakePoolId,
    originalMintId: params.originalMintId,
    userOriginalMintTokenAccountId: params.userOriginalMintTokenAccountId,
    amount: params.amount,
  });

  if (params.receiptType && params.receiptType !== ReceiptType.None) {
    const receiptMintId = params.originalMintId;
    if (
      stakeEntryData?.parsed.stakeMintClaimed ||
      stakeEntryData?.parsed.originalMintClaimed
    ) {
      throw new Error("Receipt has already been claimed.");
    }

    if (
      !stakeEntryData?.parsed ||
      stakeEntryData.parsed.amount.toNumber() === 0
    ) {
      await withClaimReceiptMint(transaction, connection, wallet, {
        stakePoolId: params.stakePoolId,
        stakeEntryId: stakeEntryId,
        originalMintId: params.originalMintId,
        receiptMintId: receiptMintId,
        receiptType: params.receiptType,
      });
    }
  }

  return transaction;
};

export const executeAllTransactions = async (
  connection: Connection,
  wallet: ReturnType<typeof iWallet>,
  txs: Transaction[],
  config: {
    throwIndividualError?: boolean;
    signers?: Signer[][];
    confirmOptions?: ConfirmOptions;
    notificationConfig?: {
      individualSuccesses?: boolean;
      successSummary?: boolean;
      message?: string;
      errorMessage?: string;
      description?: string;
    };
    callback?: (success: boolean) => void;
  }
): Promise<(string | null)[]> => {
  const transactions = txs;

  if (transactions.length === 0) return [];

  const recentBlockhash = await connection.getLatestBlockhash("finalized");

  for await (const tx of transactions) {
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = recentBlockhash.blockhash;
    tx.lastValidBlockHeight = recentBlockhash.lastValidBlockHeight;
  }
  let _txs = transactions;
  if (transactions.length > 1) {
    console.log("long txn");
    _txs = await wallet.signAllTransactions(transactions);
  } else {
    _txs = await wallet.signTransaction(transactions[0]!);
  }

  let txIds: string[] = [];
  txIds = [
    ...txIds,
    ...(
      await Promise.all(
        _txs.map(async (tx, index) => {
          try {
            console.log("testing");
            if (
              config.signers &&
              config.signers.length > 0 &&
              config.signers[index]
            ) {
              tx.partialSign(...config.signers[index]!);
            }
            const txid = await sendAndConfirmRawTransaction(
              connection,
              tx.serialize(),
              config.confirmOptions
            );

            return txid;
          } catch (e) {
            console.log(
              "Failed transaction: ",
              (e as SendTransactionError).logs,
              e
            );

            if (config.throwIndividualError) throw new Error(`${e}`);
            return null;
          }
        })
      )
    ).filter((x): x is string => x !== null),
  ];
  console.log("Successful txs", txIds);
  //   const successfulTxids = txIds.filter((txid) => txid)
  //   config.notificationConfig &&
  //     successfulTxids.length > 0 &&
  //     notify({
  //       message: `${config.notificationConfig.message} ${successfulTxids.length}/${transactions.length}`,
  //       description: config.notificationConfig.description,
  //       // Consider linking all transactions
  //       txid: '',
  //     })
  config.callback && config.callback(true);
  return txIds;
};

export async function updateStakeStatus(
  selectedSentries: SentryData[],
  connection: Connection,
  wallet: ReturnType<typeof iWallet>
) {
  const stakePoolId = STAKE_POOL_ID;
  if (!stakePoolId) throw "Stake pool not found";
  const txs: (Transaction | null)[] = await Promise.all(
    selectedSentries.map(async (token) => {
      try {
        // stake
        // console.log(stakePoolId)
        // console.log(token.mint)
        // console.log(token.publicKey)
        return stake(connection, wallet, {
          stakePoolId: stakePoolId,
          receiptType: ReceiptType.Original,
          originalMintId: new PublicKey(token.mint),
          userOriginalMintTokenAccountId: new PublicKey(token.publicKey),
          amount: new BN(1),
        });
      } catch (e) {
        console.log({
          message: `Failed to stake token ${token.publicKey}`,
          description: `${e}`,
          type: "error",
        });
        return null;
      }
    })
  );
  try {
    await executeAllTransactions(
      connection,
      wallet,
      txs.filter((tx): tx is Transaction => tx !== null),
      {
        notificationConfig: {
          message: `Successfully staked`,
          description: "Stake progress will now dynamically update",
        },
      }
    );
  } catch (e) {}

  return [];
}
