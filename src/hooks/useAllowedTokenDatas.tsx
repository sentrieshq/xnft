import { AccountData, getBatchedMultipleAccounts } from "@cardinal/common";
import type {
  StakeAuthorizationData,
  StakeEntryData,
  StakePoolData,
} from "@cardinal/staking/dist/cjs/programs/stakePool";
import { getStakeEntries } from "@cardinal/staking/dist/cjs/programs/stakePool/accounts";
import { findStakeEntryIdFromMint } from "@cardinal/staking/dist/cjs/programs/stakePool/utils";
import * as metaplex from "@metaplex-foundation/mpl-token-metadata";
import { TOKEN_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { useConnection, usePublicKey } from "react-xnft";

export type AllowedTokenData = BaseTokenData & {
  metadata?: AccountData<any> | null;
  stakeEntry?: AccountData<StakeEntryData> | null;
};

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

export const allowedTokensForPool = (
  tokenDatas: BaseTokenData[],
  allowFrozen?: boolean
) =>
  tokenDatas.filter((token) => {
    let isAllowed = true;
    const creatorAddresses = ["Ha47XzLYkuZm32A6hXnEMLxL56jkAZvT9zRKJnioFvZK"]; // TODO: Move to const for us.
    if (!allowFrozen && token.tokenAccount?.parsed.state === "frozen") {
      return false;
    }

    if (creatorAddresses.length > 0) {
      isAllowed = false;
      if (creatorAddresses && creatorAddresses.length > 0) {
        creatorAddresses.forEach((filterCreator) => {
          if (
            token?.metaplexData?.parsed?.data?.creators &&
            (token?.metaplexData?.parsed?.data?.creators).some(
              (c) => c.address === filterCreator.toString() && c.verified
            )
          ) {
            isAllowed = true;
          }
        });
      }
    }
    return isAllowed;
  });

export const useAllowedTokenDatas = (showFungibleTokens: boolean) => {
  const stakePoolId = new PublicKey(
    "3WS5GJSUAPXeLBbcPQRocxDYRtWbcX9PXb87J1TzFnmX"
  );
  const walletId = usePublicKey();
  const connection = useConnection();
  return useQuery<AllowedTokenData[] | undefined>(
    [
      "allowedTokenDatas",
      stakePoolId?.toString(), // stakePoolId?.toString()
      stakePoolId?.toString(), // stakePool?.pubkey.toString()
      walletId?.toString(),
      showFungibleTokens,
    ],
    async () => {
      if (!stakePoolId || !walletId) return;
      const allTokenAccounts = await connection.getParsedTokenAccountsByOwner(
        walletId!,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );
      const tokenAccounts = allTokenAccounts.value
        .map((tokenAccount) => ({
          pubkey: tokenAccount.pubkey,
          parsed: tokenAccount.account.data.parsed
            .info as ParsedTokenAccountData,
        }))
        .filter((tokenAccount) => tokenAccount.parsed.tokenAmount.uiAmount > 0)
        .sort((a, b) => a.pubkey.toBase58().localeCompare(b.pubkey.toBase58()));
      const metaplexIds = await Promise.all(
        tokenAccounts.map(
          async (tokenAccount) =>
            (
              await metaplex.MetadataProgram.findMetadataAccount(
                new PublicKey(tokenAccount.parsed.mint)
              )
            )[0]
        )
      );
      const metaplexAccountInfos = await getBatchedMultipleAccounts(
        connection,
        metaplexIds
      );
      const metaplexData = metaplexAccountInfos.reduce(
        (acc, accountInfo, i) => {
          try {
            acc[tokenAccounts[i]!.pubkey.toString()] = {
              pubkey: metaplexIds[i]!,
              ...accountInfo,
              parsed: metaplex.MetadataData.deserialize(
                accountInfo?.data as Buffer
              ) as metaplex.MetadataData,
            };
          } catch (e) {}
          return acc;
        },
        {} as {
          [tokenAccountId: string]: {
            pubkey: PublicKey;
            parsed: metaplex.MetadataData;
          };
        }
      );

      const baseTokenDatas = tokenAccounts.map((tokenAccount, i) => ({
        tokenAccount,
        metaplexData: metaplexData[tokenAccount.pubkey.toString()],
      }));

      const allowedTokens = allowedTokensForPool(baseTokenDatas);

      const stakeEntryIds = await Promise.all(
        allowedTokens.map(
          async (allowedToken) =>
            (
              await findStakeEntryIdFromMint(
                connection,
                walletId!,
                stakePoolId,
                new PublicKey(allowedToken.tokenAccount?.parsed.mint ?? "")
              )
            )[0]
        )
      );
      const stakeEntries =
        stakeEntryIds.length > 0
          ? await getStakeEntries(connection, stakeEntryIds)
          : [];

      const metadata = await Promise.all(
        allowedTokens.map(async (allowedToken) => {
          try {
            if (!allowedToken.metaplexData?.parsed.data.uri) return null;
            const json = await fetch(
              allowedToken.metaplexData.parsed.data.uri
            ).then((r) => r.json());
            return {
              pubkey: allowedToken.metaplexData.pubkey,
              parsed: json,
            };
          } catch (e) {
            return null;
          }
        })
      );
      return allowedTokens.map((allowedToken, i) => ({
        ...allowedToken,
        metadata: metadata.find((data) =>
          data
            ? data.pubkey.toBase58() ===
              allowedToken.metaplexData?.pubkey.toBase58()
            : undefined
        ),
        stakeEntryData: stakeEntries[i],
      }));
    },
    {
      enabled: !!stakePoolId && !!walletId,
    }
  );
};
