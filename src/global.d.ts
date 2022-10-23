import { PublicKey, Connection } from "@solana/web3.js";

declare global {
  interface Window {
    xnft: {
      solana: {
        publicKey: PublicKey;
        connection: Connection;
      };
    };
  }
}

window.MyNamespace = window.xnft || {};
