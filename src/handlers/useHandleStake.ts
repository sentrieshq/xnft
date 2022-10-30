// Credit for https://github.com/cardinal-labs/cardinal-staking-xnft/blob/main/src/handlers/useHandleStake.ts

import { updateStakeStatus } from "../utils/transactions";
import { useConnection, usePublicKey } from "react-xnft";
import { iWallet } from "../utils/wallet";
import { useTokens } from "../hooks/useTokens";
import { SentryData } from "../typings/tokenMetadata";

export const useHandleStake = (selectedSentries: SentryData[]) => {
  const walletId = usePublicKey();
  const wallet = iWallet(walletId);
  const connection = useConnection();

  const { mutate } = useTokens();

  return mutate(updateStakeStatus(selectedSentries, connection, wallet));
};
