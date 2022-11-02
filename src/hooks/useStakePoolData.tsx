import type { AccountData } from "@cardinal/common";
import type { StakePoolData } from "@cardinal/staking/dist/cjs/programs/stakePool";
import { getStakePool } from "@cardinal/staking/dist/cjs/programs/stakePool/accounts";
import { useEnvironmentCtx } from "../providers/EnvironmentProvider";
import useSWR from "swr";

import { useStakePoolId } from "./useStakePoolId";

export const useStakePoolData = () => {
  const stakePoolId = useStakePoolId();
  const { connection } = useEnvironmentCtx();

  return useSWR<AccountData<StakePoolData> | undefined>(
    ["stakePoolData", "sentries"],
    async () => {
      if (!stakePoolId) return;
      return getStakePool(connection, stakePoolId);
    }
  );
};
