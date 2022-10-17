import { useQuery } from "@tanstack/react-query";
import { useAddress } from "./useAddress";

export type Rewards = {
  rewardEpoch: number[];
  rewardAmount: number[];
  rewardPostBalance: number[];
  stake: number[];
};

export type SentriesStakingData = {
  nftCount: number;
  sentryOwnerAddress: string;
  totalStaked: number;
  maxPowerLevelSol: number;
  stakeAccountWithdrawAuthority: string;
  rewards: Rewards;
  error?: string;
};

export const usePower = () => {
  const address = useAddress();

  return useQuery<SentriesStakingData | undefined>(
    ["useSentryPower", address],
    async () => {
      return await fetch(`https://api.sentries.io/v1/power/${address}`)
        .then((response) => response.json())
        .then((data) => {
          return data;
        });
    },
    {
      enabled: !!address,
      retry: 2,
    }
  );
};
