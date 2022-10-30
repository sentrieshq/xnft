import { AccountData } from "@cardinal/common";

import { PublicKey } from "@solana/web3.js";

import * as metaplex from "@metaplex-foundation/mpl-token-metadata";
export const MAX_SENTRIES = 8000;

export const STAKE_ENTRY_SEED = "stake-entry";
export const STAKE_POOL_ADDRESS = new PublicKey(
  "stkBL96RZkjY5ine4TvPihGqW8UHJfch2cokjAPzV8i"
);
export const TOKEN_MANAGER_SEED = "token-manager";
export const TOKEN_MANAGER_ADDRESS = new PublicKey(
  "mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM"
);
import type { AnchorTypes } from "@saberhq/anchor-contrib";

import * as STAKE_POOL_TYPES from "../idl/cardinal_stake_pool";

export const STAKE_POOL_IDL = STAKE_POOL_TYPES.IDL;
export const STAKE_AUTHORIZATION_SEED = "stake-authorization";

export type STAKE_POOL_PROGRAM = STAKE_POOL_TYPES.CardinalStakePool;

export type StakePoolTypes = AnchorTypes<STAKE_POOL_PROGRAM>;
type Accounts = StakePoolTypes["Accounts"];
export type StakeEntryData = Accounts["stakeEntry"];
export type StakePoolData = Accounts["stakePool"];

export type ParsedTokenAccountData = {
  isNative: boolean;
  delegate: string;
  mint: string;
  owner: string;
  state: "initialized" | "frozen";
  tokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
  };
};

export type BaseTokenData = {
  tokenAccount?: AccountData<ParsedTokenAccountData>;
  metaplexData?: AccountData<metaplex.MetadataData>;
};

export type AllowedTokenData = BaseTokenData & {
  metadata?: AccountData<any> | null;
  stakeEntry?: AccountData<StakeEntryData> | null;
};

type AccountFn<T> = () => Promise<AccountData<T>>;

export enum ReceiptType {
  // Receive the original mint wrapped in a token manager
  Original = 1,
  // Receive a receipt mint wrapped in a token manager
  Receipt = 2,
  // Receive nothing
  None = 3,
}
