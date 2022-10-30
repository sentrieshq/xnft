// Credit for https://github.com/cardinal-labs/cardinal-staking-xnft/blob/main/src/handlers/useHandleStake.ts
import { createStakeEntryAndStakeMint, stake } from "@cardinal/staking";
import { ReceiptType } from "@cardinal/staking/dist/cjs/programs/stakePool";
import { BN } from "@project-serum/anchor";
import { PublicKey, Signer, Transaction } from "@solana/web3.js";
import { executeAllTransactions } from "../utils/transactions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AllowedTokenData } from "../hooks/useAllowedTokenDatas";
import { useConnection, usePublicKey } from "react-xnft";
import { iWallet } from "../utils/wallet";

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
