import { AccountData, getBatchedMultipleAccounts } from "@cardinal/common";
import * as metaplex from "@metaplex-foundation/mpl-token-metadata";
import { TOKEN_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useConnection, usePublicKey } from "react-xnft";
import * as web3 from "@solana/web3.js";
import { SignerWallet } from "@saberhq/solana-contrib";
import type { Connection } from "@solana/web3.js";

import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
  BN,
  utils,
} from "@project-serum/anchor";

export const STAKE_ENTRY_SEED = "stake-entry";
export const STAKE_POOL_ADDRESS = new PublicKey(
  "stkBL96RZkjY5ine4TvPihGqW8UHJfch2cokjAPzV8i"
);
import type { AnchorTypes } from "@saberhq/anchor-contrib";

import * as STAKE_POOL_TYPES from "../idl/cardinal_stake_pool";
import useSWR from "swr";

export const STAKE_POOL_IDL = STAKE_POOL_TYPES.IDL;

export type STAKE_POOL_PROGRAM = STAKE_POOL_TYPES.CardinalStakePool;

export type StakePoolTypes = AnchorTypes<STAKE_POOL_PROGRAM>;
type Accounts = StakePoolTypes["Accounts"];
export type StakeEntryData = Accounts["stakeEntry"];
export type StakePoolData = Accounts["stakePool"];

export type BaseTokenData = {
  tokenAccount?: AccountData<ParsedTokenAccountData>;
  metaplexData?: AccountData<metaplex.MetadataData>;
};

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

export const getStakeEntries = async (
  connection: Connection,
  stakeEntryIds: PublicKey[]
): Promise<AccountData<StakeEntryData>[]> => {
  const stakePoolProgram = getProgram(connection);

  const stakeEntries = (await stakePoolProgram.account.stakeEntry.fetchMultiple(
    stakeEntryIds
  )) as StakePoolData[];
  return stakeEntries.map((tm, i) => ({
    parsed: tm,
    pubkey: stakeEntryIds[i]!,
  }));
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
  return useSWR<AllowedTokenData[] | undefined>(
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
              await web3.PublicKey.findProgramAddress(
                [
                  utils.bytes.utf8.encode(STAKE_ENTRY_SEED),
                  stakePoolId.toBuffer(),
                  new PublicKey(
                    allowedToken.tokenAccount?.parsed.mint ?? ""
                  ).toBuffer(),
                  walletId!.toBuffer(),
                ],
                STAKE_POOL_ADDRESS
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
    }
    // {
    //   enabled: !!stakePoolId && !!walletId,
    // }
  );
};
