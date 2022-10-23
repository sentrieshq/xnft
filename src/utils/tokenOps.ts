import { PublicKey, Connection } from "@solana/web3.js";
import {
  SentryData,
  TokenAccounts,
  TokenState,
} from "../typings/tokenMetadata";

export async function getTokens(wallet: PublicKey, connection: Connection) {
  // @ts-ignore
  const res = (await connection.customSplTokenAccounts(
    wallet
  )) as TokenAccounts;

  // Retrieve only Sentries
  const sentries: Omit<SentryData, "staked">[] = res.nftMetadata
    .map(([_, entry]) => ({
      ...entry.tokenMetaUriData,
      mint: entry.metadata.mint,
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
