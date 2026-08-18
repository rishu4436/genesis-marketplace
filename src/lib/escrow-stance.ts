/**
 * Honest escrow stance.
 * Soft hire must never wait on ERC-8183. Testnet policy is not whitelisted.
 */

export const ESCROW_STANCE = {
  required: false,
  available: false,
  protocol: "ERC-8183" as const,
  reason: "PolicyNotWhitelisted",
  path: "/fund",
  note: "Plan delivers without escrow. On-chain lock is optional when policy allows.",
};

export type EscrowStance = typeof ESCROW_STANCE;
