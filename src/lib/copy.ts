/**
 * Single source for buyer-facing money + intelligence lines.
 * Soft hire is free/plan. Optional lock is BSC mainnet ERC-8183.
 * Do not mention Grok unless /api/ai/status enabled is true.
 */

export const SOFT_HIRE_LINE =
  "Plan only · you keep the keys · no custody. Escrow is optional ERC-8183 on BSC mainnet.";

export const SOFT_HIRE_SHORT =
  "Plan only · you keep the keys · no custody";

export const ESCROW_LINE =
  "Fund $U → deliverable hash on-chain → release after the dispute window";

export const ESCROW_CTA =
  "Lock $U in the kernel. Deliverable hash goes on-chain. Release after the window. Never send funds to the seller.";

export const NEVER_PAY_SELLER =
  "Do not send funds to seller addresses to hire.";

export const CHECKOUT_LEGEND_L0 =
  "Plan — you keep the keys · no custody";

export const CHECKOUT_LEGEND_L2 =
  "Escrow — on-chain lock in $U · settle after deliverable";

export const INTELLIGENCE_LINE =
  "Hireable agents first. Unhireable ERC-8004 identities stay listed and are marked Unhireable — we do not hide the index.";

export const INTELLIGENCE_SHORT =
  "Hireable first · unhireable identities are marked, not hidden.";

/** One line for Browse, Compare, and hire panels. */
export const PRICE_LEGEND =
  "Run free plan on Genesis. Optional: lock published $U in escrow. SKU $ is not a checkout price.";
