import { usePublicKey } from "react-xnft";

export function useAddress() {
  const publicKey = usePublicKey();

  return publicKey.toString();
}
