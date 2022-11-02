import React, { useContext, useState } from "react";
import { ReceiptType } from "@cardinal/staking/dist/cjs/programs/stakePool";
import { PublicKey } from "@solana/web3.js";
import type { CSSProperties } from "react";
export enum TokenStandard {
  // Fungible, can have more than 1
  Fungible = 1,
  // Non fungible are all unique
  NonFungible = 2,
  // No receipt
  None = 3,
}

export type Analytic = {
  metadata?: {
    key: string;
    type: "staked";
    totals?: {
      key: string;
      value: number;
    }[];
  };
};
export type StakePoolMetadata = {
  // Name of this stake pool used as an id. Should be in lower-case kebab-case since it is used in the URL as /{name}
  // https://www.theserverside.com/blog/Coffee-Talk-Java-News-Stories-and-Opinions/Why-you-should-make-kebab-case-a-URL-naming-convention-best-practice
  name: string;
  // Display name to be displayed in the header. Often the same as name but with capital letters and spaces
  displayName: string;
  // Whether or not to show name in header, defaults false
  nameInHeader?: boolean;
  // Publickey for this stake pool
  stakePoolAddress: PublicKey;
  // Description for this stake pool
  description?: string;
  // Default receipt type. Setting this will remove the option for the user to choose which receipt type to use
  receiptType?: ReceiptType;
  // Default empty. Setting this will tell the UI to only show tokens of that standard. Supports fungible or non-fungible
  tokenStandard?: TokenStandard;
  // Optional config to hide this pool from the main page
  hidden?: boolean;
  // Optional config to disable finding this pool
  notFound?: boolean;
  // Optional hostname to remap
  hostname?: string;
  // Optional hide footer
  hideFooter?: boolean;
  // Optional config to link redirect to page when you click on this pool
  redirect?: string;
  // Hide allowed tokens style
  hideAllowedTokens?: boolean;
  // styles to apply to the whole stake pool
  styles?: CSSProperties;
  // Contrast dark background
  darkBg?: boolean;
  // Contrast light background
  lightBg?: boolean;
  // Colors object to style the stake page
  colors?: {
    primary: string;
    secondary: string;
    accent?: string;
    fontColor?: string;
    fontColorSecondary?: string;
    backgroundSecondary?: string;
  };
  // Disallow regions based on IP address
  disallowRegions?: { code: string; subdivision?: string }[];
  // If the logo should be displayed with paddding
  logoPadding?: boolean;
  // Optional social links
  socialLinks?: [];
  // Image url to be used as the icon in the pool selector and the header
  imageUrl?: string;
  // Secondary image url to be used next to the icon in the pool selector and the header
  secondaryImageUrl?: string;
  // Background image for pool
  backgroundImage?: string;
  // Website url if specified will be navigated to when the image in the header is clicked
  websiteUrl?: string;
  // Max staked is used to compute percentage of total staked
  maxStaked?: number;
  // Links to show at the top right of the page
  links?: { text: string; value: string }[];
  // Analytics to show at the top of stake pool. supports trait based analytics and overall tokens data
  analytics?: Analytic[];
};

export interface StakePoolMetadataValues {
  stakePoolMetadata: StakePoolMetadata | null;
  setStakePoolMetadata: (stakePoolMetadata: StakePoolMetadata | null) => void;
}

const EnvironmentContext: React.Context<null | StakePoolMetadataValues> =
  React.createContext<null | StakePoolMetadataValues>(null);

export const stakePoolMetadatas: StakePoolMetadata[] = [
  {
    name: "sentries",
    displayName: "Sentries",
    stakePoolAddress: new PublicKey(
      "3WS5GJSUAPXeLBbcPQRocxDYRtWbcX9PXb87J1TzFnmX"
    ),
    websiteUrl: "https://www.sentries.io/",
    receiptType: ReceiptType.Original,
    lightBg: true,
    maxStaked: 8000, // update with collection size
    imageUrl:
      "https://github.com/cardinal-labs/cardinal-staking-xnft/blob/main/assets/logos/sentries-logo.svg?raw=true",
    tokenStandard: TokenStandard.NonFungible,
    colors: {
      primary: "#383838",
      secondary: "#fff",
      accent: "#0d0d0d",
      fontColor: "#fff",
      fontColorSecondary: "#000",
    },
  },
];

export function StakePoolMetadataProvider({
  children,
}: {
  children: React.ReactChild;
}) {
  const [stakePoolMetadata, setStakePoolMetadata] =
    useState<StakePoolMetadata | null>(null);
  return (
    <EnvironmentContext.Provider
      value={{
        stakePoolMetadata: stakePoolMetadatas[0],
        setStakePoolMetadata: () => {
          setStakePoolMetadata(stakePoolMetadatas[0]);
        },
      }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useStakePoolMetadata(): StakePoolMetadataValues {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error("Missing stakePoolMetadata context");
  }
  return context;
}
