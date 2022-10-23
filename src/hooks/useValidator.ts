import useSWR from "swr";

export type ValidatorInfoData = {
  address: string;
  totalStakedAccounts: number;
  totalSolStaked: number;
  error?: string;
};

export const useValidator = () => {
  return useSWR<ValidatorInfoData | undefined>(
    `https://api.sentries.io/v1/validator/LodezVTbz3v5GK6oULfWNFfcs7D4rtMZQkmRjnh65gq`
  );
};
