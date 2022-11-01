type Attribute = {
  trait_type: string;
  value: string;
};

type Collection = {
  family: string;
  name: string;
};

export type TokenMetaUriData = {
  attributes: Attribute[];
  collection: Collection;
  description: string;
  external_url: string;
  image: string;
  name: string;
  properties: {};
  seller_fee_basis_points: number;
  symbol: string;
};

type TokenData = {
  metadata: {
    mint: string;
  };
  metadataAddress: string;
  publicKey: string;
  tokenMetaUriData: TokenMetaUriData;
};

type Metadata = [string, TokenData];

export type NftMetadata = Metadata[];

export type TokenAccounts = {
  nftMetadata: NftMetadata;
  tokenAccountsMap: [];
  tokenMetadata: [];
};

export enum TokenState {
  Staked = "frozen",
  Unstaked = "initialized",
}

export type SentryData = TokenMetaUriData & {
  mint: string;
  staked: boolean;
  publicKey: string;
};
