import type {
  AccountMeta,
  Connection,
  TransactionInstruction,
} from "@solana/web3.js";
import { findAta } from "@cardinal/common";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  findMintCounterId,
  findTokenManagerAddress,
} from "@cardinal/token-manager/dist/cjs/programs/tokenManager/pda";
import {
  CRANK_KEY,
  getRemainingAccountsForKind,
  TokenManagerKind,
  TokenManagerState,
} from "@cardinal/token-manager/dist/cjs/programs/tokenManager";

import type { Wallet } from "@saberhq/solana-contrib";

import { MetadataProgram } from "@metaplex-foundation/mpl-token-metadata";
import { AnchorProvider, BN, Program } from "@project-serum/anchor";

import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from "@solana/web3.js";

import * as STAKE_POOL_TYPES from "../idl/cardinal_stake_pool";

export const TOKEN_MANAGER_SEED = "token-manager";
export const TOKEN_MANAGER_ADDRESS = new PublicKey(
  "mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM"
);

export const STAKE_POOL_ADDRESS = new PublicKey(
  "stkBL96RZkjY5ine4TvPihGqW8UHJfch2cokjAPzV8i"
);

export const STAKE_POOL_SEED = "stake-pool";

export const STAKE_ENTRY_SEED = "stake-entry";

export const IDENTIFIER_SEED = "identifier";

export const STAKE_AUTHORIZATION_SEED = "stake-authorization";

export const STAKE_BOOSTER_SEED = "stake-booster";

export const AUTHORITY_OFFSET = 25;
export const STAKER_OFFSET = 82;
export const POOL_OFFSET = 9;

export type STAKE_POOL_PROGRAM = STAKE_POOL_TYPES.CardinalStakePool;

export const STAKE_POOL_IDL = STAKE_POOL_TYPES.IDL;

export type StakePoolTypes = AnchorTypes<STAKE_POOL_PROGRAM>;

type Accounts = StakePoolTypes["Accounts"];
export type StakePoolData = Accounts["stakePool"];
export type StakeEntryData = Accounts["stakeEntry"];
export type IdentifierData = Accounts["identifier"];
export type StakeAuthorizationData = Accounts["stakeAuthorizationRecord"];
export type StakeBoosterData = Accounts["stakeBooster"];

export const STAKE_BOOSTER_PAYMENT_MANAGER_NAME = "cardinal-stake-booster";
export const STAKE_BOOSTER_PAYMENT_MANAGER = new PublicKey(
  "CuEDMUqgkGTVcAaqEDHuVR848XN38MPsD11JrkxcGD6a" // cardinal-stake-booster
);

export enum ReceiptType {
  // Receive the original mint wrapped in a token manager
  Original = 1,
  // Receive a receipt mint wrapped in a token manager
  Receipt = 2,
  // Receive nothing
  None = 3,
}

export const claimReceiptMint = async (
  connection: Connection,
  wallet: Wallet,
  params: {
    stakeEntryId: PublicKey;
    tokenManagerReceiptMintTokenAccountId: PublicKey;
    originalMintId: PublicKey;
    receiptMintId: PublicKey;
    receiptType: ReceiptType;
  }
): Promise<TransactionInstruction> => {
  const provider = new AnchorProvider(connection, wallet, {});
  const stakePoolProgram = new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );

  const [
    [tokenManagerId],
    [mintCounterId],
    stakeEntryReceiptMintTokenAccountId,
    userReceiptMintTokenAccountId,
    remainingAccounts,
  ] = await Promise.all([
    findTokenManagerAddress(params.receiptMintId),
    findMintCounterId(params.receiptMintId),
    findAta(params.receiptMintId, params.stakeEntryId, true),
    findAta(params.receiptMintId, wallet.publicKey, true),
    getRemainingAccountsForKind(
      params.receiptMintId,
      params.receiptType === ReceiptType.Original
        ? TokenManagerKind.Edition
        : TokenManagerKind.Managed
    ),
  ]);

  return stakePoolProgram.instruction.claimReceiptMint({
    accounts: {
      stakeEntry: params.stakeEntryId,
      originalMint: params.originalMintId,
      receiptMint: params.receiptMintId,
      stakeEntryReceiptMintTokenAccount: stakeEntryReceiptMintTokenAccountId,
      user: wallet.publicKey,
      userReceiptMintTokenAccount: userReceiptMintTokenAccountId,
      mintCounter: mintCounterId,
      tokenManager: tokenManagerId,
      tokenManagerReceiptMintTokenAccount:
        params.tokenManagerReceiptMintTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenManagerProgram: TOKEN_MANAGER_ADDRESS,
      systemProgram: SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    },
    remainingAccounts,
  });
};

export const mStake = (
  connection: Connection,
  wallet: Wallet,
  params: {
    originalMint: PublicKey;
    stakeEntryId: PublicKey;
    stakePoolId: PublicKey;
    stakeEntryOriginalMintTokenAccountId: PublicKey;
    userOriginalMintTokenAccountId: PublicKey;
    amount: BN;
  }
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});
  const stakePoolProgram = new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );

  return stakePoolProgram.instruction.stake(params.amount, {
    accounts: {
      stakeEntry: params.stakeEntryId,
      stakePool: params.stakePoolId,
      stakeEntryOriginalMintTokenAccount:
        params.stakeEntryOriginalMintTokenAccountId,
      originalMint: params.originalMint,
      user: wallet.publicKey,
      userOriginalMintTokenAccount: params.userOriginalMintTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });
};

export const unstake = (
  connection: Connection,
  wallet: Wallet,
  params: {
    stakePoolId: PublicKey;
    stakeEntryId: PublicKey;
    originalMintId: PublicKey;
    stakeEntryOriginalMintTokenAccount: PublicKey;
    userOriginalMintTokenAccount: PublicKey;
    user: PublicKey;
    remainingAccounts: AccountMeta[];
  }
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});
  const stakePoolProgram = new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );
  return stakePoolProgram.instruction.unstake({
    accounts: {
      stakePool: params.stakePoolId,
      stakeEntry: params.stakeEntryId,
      originalMint: params.originalMintId,
      stakeEntryOriginalMintTokenAccount:
        params.stakeEntryOriginalMintTokenAccount,
      user: params.user,
      userOriginalMintTokenAccount: params.userOriginalMintTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    remainingAccounts: params.remainingAccounts,
  });
};
