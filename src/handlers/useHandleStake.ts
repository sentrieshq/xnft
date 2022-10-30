// Credit for https://github.com/cardinal-labs/cardinal-staking-xnft/blob/main/src/handlers/useHandleStake.ts
import { AccountData } from "@cardinal/common";
import {
  PublicKey,
  Keypair,
  Signer,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { executeAllTransactions } from "../utils/transactions";
import * as metaplex from "@metaplex-foundation/mpl-token-metadata";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnection, usePublicKey } from "react-xnft";
import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { iWallet } from "../utils/wallet";
import type { Connection } from "@solana/web3.js";
import { SignerWallet } from "@saberhq/solana-contrib";
import type { Wallet } from "@saberhq/solana-contrib";
import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
  BN,
  utils,
} from "@project-serum/anchor";

import { claimReceiptMint, mStake } from "../utils/instruction";

export const STAKE_ENTRY_SEED = "stake-entry";
export const STAKE_POOL_ADDRESS = new PublicKey(
  "stkBL96RZkjY5ine4TvPihGqW8UHJfch2cokjAPzV8i"
);
export const TOKEN_MANAGER_SEED = "token-manager";
export const TOKEN_MANAGER_ADDRESS = new PublicKey(
  "mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM"
);
import type { AnchorTypes } from "@saberhq/anchor-contrib";

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
  wallet: Wallet,
  params: {
    stakePoolId: PublicKey;
    originalMintId: PublicKey;
    userOriginalMintTokenAccountId: PublicKey;
    receiptType?: ReceiptType;
    amount?: BN;
  }
): Promise<Transaction> => {
  const supply = await getMintSupply(connection, params.originalMintId);
  if (
    (supply.gt(new BN(1)) || params.amount?.gt(new BN(1))) &&
    params.receiptType === ReceiptType.Original
  ) {
    throw new Error("Fungible with receipt type Original is not supported yet");
  }

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

  const stakeEntryData = await tryGetAccount(() =>
    getStakeEntry(connection, stakeEntryId)
  );
  if (!stakeEntryData) {
    [transaction] = await createStakeEntry(connection, wallet, {
      stakePoolId: params.stakePoolId,
      originalMintId: params.originalMintId,
    });
  }

  await withStake(transaction, connection, wallet, {
    stakePoolId: params.stakePoolId,
    originalMintId: params.originalMintId,
    userOriginalMintTokenAccountId: params.userOriginalMintTokenAccountId,
    amount: params.amount,
  });

  if (params.receiptType && params.receiptType !== ReceiptType.None) {
    const receiptMintId =
      params.receiptType === ReceiptType.Receipt
        ? stakeEntryData?.parsed.stakeMint
        : params.originalMintId;
    if (!receiptMintId) {
      throw new Error(
        "Stake entry has no stake mint. Initialize stake mint first."
      );
    }
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

export const useHandleStake = () => {
  const walletId = usePublicKey();
  const wallet = iWallet(walletId);
  const connection = useConnection();
  const queryClient = useQueryClient();
  const stakePoolId = new PublicKey(
    "3WS5GJSUAPXeLBbcPQRocxDYRtWbcX9PXb87J1TzFnmX"
  ); // TODO: Move to const for us.

  return useMutation(
    async ({
      tokenDatas,
      receiptType = ReceiptType.Original,
    }: {
      tokenDatas: ({ amount?: BN } & Pick<
        AllowedTokenData,
        "tokenAccount" | "stakeEntry"
      >)[];
      receiptType?: ReceiptType;
    }): Promise<string[]> => {
      if (!stakePoolId) throw "Stake pool not found";
      if (tokenDatas.length <= 0) throw "No tokens selected";
      const txs: (Transaction | null)[] = await Promise.all(
        tokenDatas.map(async (token) => {
          try {
            if (!token.tokenAccount) throw "Token account invalid";
            // if (
            //   token.stakeEntry &&
            //   token.stakeEntry.parsed.amount.toNumber() > 0
            // ) {
            //   throw 'Fungible tokens already staked in the pool. Staked tokens need to be unstaked and then restaked together with the new tokens.'
            // }
            // const amount = token?.amount
            //   ? new BN(
            //       token?.amount && token.tokenListData
            //         ? parseMintNaturalAmountFromDecimal(
            //             token?.amount,
            //             token.tokenListData.decimals
            //           ).toString()
            //         : 1
            //     )
            //   : undefined
            // stake
            return stake(connection, wallet, {
              stakePoolId: stakePoolId,
              receiptType:
                (!token.amount ||
                  (token.amount &&
                    token.amount.eq(new BN(1)) &&
                    receiptType === ReceiptType.Receipt)) &&
                receiptType !== ReceiptType.None
                  ? receiptType
                  : undefined,
              originalMintId: new PublicKey(token.tokenAccount.parsed.mint),
              userOriginalMintTokenAccountId: token.tokenAccount.pubkey,
              amount: token.amount,
            });
          } catch (e) {
            console.log({
              message: `Failed to unstake token ${token?.stakeEntry?.pubkey.toString()}`,
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
    },
    {
      onSuccess: () => {
        queryClient.resetQueries();
      },
    }
  );
};
