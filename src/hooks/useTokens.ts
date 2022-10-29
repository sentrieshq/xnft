import useSWR from "swr";
import { getTokens } from "../utils/tokenOps";

export function useTokens() {
  const {
    data: sentries,
    error,
    mutate,
  } = useSWR(
    "sentriesInit",
    () =>
      getTokens(window.xnft.solana.publicKey, window.xnft.solana.connection),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    sentries: sentries ? sentries : [],
    error,
    isLoading: !sentries && !error,
    mutate,
  };
}
