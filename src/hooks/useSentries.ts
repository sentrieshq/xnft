import { useQuery } from "@tanstack/react-query";

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
  return useQuery<SentriesDetailsData | undefined>(
    ["useSentriesStats"],
    async () => {
      return await fetch(`https://api.sentries.io/v1/sentries`)
        .then((response) => response.json())
        .then((data) => {
          return data;
        });
    },
    {
      retry: 2,
    }
  );
};
