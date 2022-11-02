import { AccountData, shortPubKey } from "@cardinal/common";
import type { StakePoolData } from "@cardinal/staking/dist/cjs/programs/stakePool";
import { getAllStakePools } from "@cardinal/staking/dist/cjs/programs/stakePool/accounts";
import type { StakePoolMetadata } from "../providers/StakePoolMetadataProvider";
import { stakePoolMetadatas } from "../providers/StakePoolMetadataProvider";
import { useEnvironmentCtx } from "../providers/EnvironmentProvider";
import useSWR from "swr";

export type StakePool = {
  stakePoolMetadata?: StakePoolMetadata;
  stakePoolData?: AccountData<StakePoolData>;
};

export const stakePoolId = (stakePool: StakePool) =>
  stakePool.stakePoolMetadata?.stakePoolAddress ??
  stakePool.stakePoolData?.pubkey;

export const stakePoolDisplayName = (stakePool: StakePool) =>
  stakePool.stakePoolMetadata?.displayName ??
  shortPubKey(stakePool.stakePoolData?.pubkey);

export const useAllStakePools = () => {
  const { connection } = useEnvironmentCtx();
  return useSWR<
    | {
        stakePoolsWithMetadata: StakePool[];
        stakePoolsWithoutMetadata: StakePool[];
      }
    | undefined
  >(["useAllStakePools"], async () => {
    const allStakePoolDatas = await getAllStakePools(connection);
    const [stakePoolsWithMetadata, stakePoolsWithoutMetadata] =
      allStakePoolDatas.reduce(
        (acc, stakePoolData) => {
          const stakePoolMetadata = stakePoolMetadatas.find(
            (md: any) =>
              md.stakePoolAddress.toString() === stakePoolData.pubkey.toString()
          );
          if (stakePoolMetadata) {
            return [[...acc[0], { stakePoolMetadata, stakePoolData }], acc[1]];
          }
          return [acc[0], [...acc[1], { stakePoolData }]];
        },
        [[] as StakePool[], [] as StakePool[]]
      );
    return {
      stakePoolsWithMetadata: stakePoolsWithMetadata.sort((a, b) =>
        a
          .stakePoolMetadata!.name.toString()
          .localeCompare(b.stakePoolMetadata!.name.toString())
      ),
      stakePoolsWithoutMetadata: stakePoolsWithoutMetadata,
    };
  });
};
