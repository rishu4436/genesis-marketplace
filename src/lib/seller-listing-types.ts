import type { CategoryId } from "./categories";

export type SellerGate = "indexed" | "hireable";

export type SellerListing = {
  id: string;
  chainId: number;
  tokenId: string;
  ownerAddress: string;
  accountId: string;
  name: string;
  categoryId: CategoryId | null;
  a2aUrl: string;
  youSend: string;
  youGet: string;
  lockU: string | null;
  quoteOnly: boolean;
  gate: SellerGate;
  probeOk?: boolean;
  probeAt?: string;
  probeError?: string;
  claimedAt: string;
  updatedAt: string;
};
