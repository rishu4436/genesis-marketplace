/**
 * Historical job.payment shape (card demo / wallet checkout).
 * Hire no longer offers those rails. Types remain so old receipts parse.
 */

export type DemoPayMethod = "card" | "wallet";

export type DemoPayment = {
  id: string;
  method: DemoPayMethod;
  status: "succeeded" | "declined";
  amountUsd: number;
  demo: boolean;
  createdAt: string;
  last4?: string;
  brand?: string;
  walletAddress?: string;
  walletSource?: "injected";
  txHash?: string;
  chainId?: number;
  amountWei?: string;
  amountBnb?: string;
  payTo?: string;
};

export function shortWallet(addr?: string) {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
