import useSWR from "swr";

export type SentriesDetailsData = {
  poweredSentries: number;
  stakedSentries: number;
  floorPrice: number;
  solPowering: number;
  solPrice: number;
  epoch: number;
  epochPct: number;
  epochTimeLeft: string;
  error?: string;
};

export const useSentries = () => {
  return useSWR<SentriesDetailsData | undefined>(
    "https://api.sentries.io/v1/sentries"
  );
};
