/**
 * Honest escrow stance.
 * Soft hire must never wait on ERC-8183. Optional lock is ERC-8183 on
 * BSC mainnet (7d window).
 */

export const ESCROW_STANCE = {
  required: false,
  available: true,
  protocol: "ERC-8183" as const,
  reason: "BscMainnet",
  path: "/fund",
  network: "bsc-mainnet" as const,
  note: "Plan delivers without escrow. Optional on-chain lock is ERC-8183 on BSC mainnet (7-day window).",
};

export type EscrowStance = typeof ESCROW_STANCE;
