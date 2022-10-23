import useSWR from "swr";
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

  return useSWR<SentriesStakingData | undefined>(
    address ? `https://api.sentries.io/v1/power/${address}` : null
  );
};
