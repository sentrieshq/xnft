import { PublicKey, Connection, Transaction, Signer } from "@solana/web3.js";
import {
  SentryData,
  TokenAccounts,
  TokenState,
} from "../typings/tokenMetadata";
import { stake, createStakeEntryAndStakeMint } from "@cardinal/staking";

import { ReceiptType } from "@cardinal/staking/dist/cjs/programs/stakePool";
import { executeAllTransactions } from "./transactions";
import type { Wallet } from "@saberhq/solana-contrib";
import { BN } from "@project-serum/anchor";
import { AllowedTokenData } from "../hooks/useAllowedTokenDatas";

export async function getTokens(wallet: PublicKey, connection: Connection) {
  // @ts-ignore
  const res = (await connection.customSplTokenAccounts(
    wallet
  )) as TokenAccounts;
  // Retrieve only Sentries
  const sentries: Omit<SentryData, "staked">[] = res.nftMetadata
    .map(([publicKey, entry]) => ({
      ...entry.tokenMetaUriData,
      mint: entry.metadata.mint,
      publicKey: publicKey,
    }))
    .filter((nft) => nft.name.includes("Sentry"));

  // Check each stake status
  const tokensWithStakeStatus = await getTokensWithStakeStatus(
    sentries,
    connection
  );
  return tokensWithStakeStatus;
}

async function getTokensWithStakeStatus(
  tokens: Omit<SentryData, "staked">[],
  connection: Connection
): Promise<SentryData[]> {
  if (tokens.length === 0) return [];

  const sentries: SentryData[] = [];

  for await (const sentry of tokens) {
    const largestAccounts = await connection.getTokenLargestAccounts(
      new PublicKey(sentry.mint)
    );
    const largestAccountInfo = await connection.getParsedAccountInfo(
      largestAccounts.value[0].address
    );
    // @ts-ignore
    const state = largestAccountInfo.value?.data.parsed.info.state;

    sentries.push({
      ...sentry,
      staked: state === TokenState.Staked ? true : false,
    });
  }

  return sentries;
}

export async function updateStakeStatus(
  selectedSentries: ({ amount?: BN } & Pick<
    AllowedTokenData,
    "tokenAccount" | "stakeEntry"
  >)[],
  connection: Connection,
  wallet: Wallet,
  stakePoolId: PublicKey,
  receiptType?: ReceiptType
) {
  if (!stakePoolId) throw "Stake pool not found";
  if (selectedSentries.length <= 0) throw "No tokens selected";
  const initTxs: { tx: Transaction; signers: Signer[] }[] = [];
  for (let i = 0; i < selectedSentries.length; i++) {
    try {
      const token = selectedSentries[i]!;
      if (!token.tokenAccount) throw "Token account invalid";
      if (receiptType === ReceiptType.Receipt) {
        console.log("Creating stake entry and stake mint...");
        const [initTx, , stakeMintKeypair] = await createStakeEntryAndStakeMint(
          connection,
          wallet,
          {
            stakePoolId: stakePoolId,
            originalMintId: new PublicKey(token.tokenAccount.parsed.mint),
          }
        );
        if (initTx.instructions.length > 0) {
          initTxs.push({
            tx: initTx,
            signers: stakeMintKeypair ? [stakeMintKeypair] : [],
          });
        }
      }
    } catch (e) {
      console.log(e);
      // notify({
      //   message: `Failed to stake token ${tokens[
      //     i
      //   ]?.stakeEntry?.pubkey.toString()}`,
      //   description: `${e}`,
      //   type: 'error',
      // })
    }
  }

  if (initTxs.length > 0) {
    try {
      await executeAllTransactions(
        connection,
        wallet,
        initTxs.map(({ tx }) => tx),
        {
          signers: initTxs.map(({ signers }) => signers),
          throwIndividualError: true,
          notificationConfig: {
            message: `Successfully staked`,
            description: "Stake progress will now dynamically update",
          },
        }
      );
    } catch (e) {
      console.log(e);
    }
  }

  const txs: (Transaction | null)[] = await Promise.all(
    selectedSentries.map(async (token) => {
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
  //console.log(txs)
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
  } catch (e) {
    console.log(e);
  }

  return [];
}
