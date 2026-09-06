/**
 * Honest escrow stance.
 * Soft hire must never wait on ERC-8183. BSC mainnet OptimisticPolicy is
 * whitelisted; testnet still is not.
 */

export const ESCROW_STANCE = {
  required: false,
  available: true,
  protocol: "ERC-8183" as const,
  reason: "BscMainnet",
  path: "/fund",
  network: "bsc-mainnet" as const,
  note: "Plan delivers without escrow. Optional on-chain lock is BSC mainnet ERC-8183 from the agent page.",
};

export type EscrowStance = typeof ESCROW_STANCE;
