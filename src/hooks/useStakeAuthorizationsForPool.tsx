import type { AccountData } from "@cardinal/common";
import type { StakeAuthorizationData } from "@cardinal/staking/dist/cjs/programs/stakePool";
import { getStakeAuthorizationsForPool } from "@cardinal/staking/dist/cjs/programs/stakePool/accounts";
import { useEnvironmentCtx } from "../providers/EnvironmentProvider";
import useSWR from "swr";

import { useStakePoolId } from "./useStakePoolId";

export const useStakeAuthorizationsForPool = () => {
  const { secondaryConnection } = useEnvironmentCtx();
  const stakePoolId = useStakePoolId();
  return useSWR<AccountData<StakeAuthorizationData>[] | undefined>(
    ["useStakeAuthorizationsForPool", stakePoolId?.toString()],
    async () => {
      if (stakePoolId) {
        return getStakeAuthorizationsForPool(secondaryConnection, stakePoolId);
      }
    }
  );
};
