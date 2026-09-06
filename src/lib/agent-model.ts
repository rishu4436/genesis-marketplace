/**
 * Genesis Agent Model v2 — inspired by bnb-chain/stockanalyst-agent-demo,
 * improved for a multi-category marketplace.
 *
 * StockAnalyst demo strengths we adopt:
 *  - Free vs paid commerce tiers
 *  - Buyer context (portfolio / risk) like UOMP Guard
 *  - Multi-source analysis + structured report
 *  - Clear recommendation + metrics
 *  - Escrow path (ERC-8183) as top tier when protocol allows
 *
 * Marketplace improvements over the single-agent demo:
 *  - Job-first discovery across 4 DeFi categories
 *  - Specialist matching + scores
 *  - Shareable jobs + outcomes ledger
 *  - Packages (multi-agent)
 */

export type CommerceTier = "free" | "full" | "escrow";

export type TierSpec = {
  id: CommerceTier;
  label: string;
  short: string;
  costLabel: string;
  settlement: string;
  speed: string;
  includes: string[];
  available: boolean;
  reason?: string;
};

export function marketplaceTiers(opts?: {
  x402?: boolean;
  escrowAvailable?: boolean;
}): TierSpec[] {
  const escrowOk = opts?.escrowAvailable === true;
  return [
    {
      id: "free",
      label: "Free scan",
      short: "Free",
      costLabel: "0 U",
      settlement: "None — identity of request only",
      speed: "~1s",
      includes: [
        "Quick metrics table",
        "Category fit + confidence",
        "No full plan sections",
      ],
      available: true,
    },
    {
      id: "full",
      label: "L0 Plan-only",
      short: "L0",
      costLabel: "Free / listed $ (soft settle)",
      settlement: "Plan-only · you keep the keys · no on-chain lock",
      speed: "~2–5s",
      includes: [
        "Multi-source DeFi brief",
        "Bull / bear thesis",
        "Execution checklist",
        "Buyer-context aware notes",
        "Shareable result page",
      ],
      available: true,
    },
    {
      id: "escrow",
      label: "L2 Escrow hire",
      short: "L2",
      costLabel: "0.08+ U lock from the agent page",
      settlement: "Optional ERC-8183 fund → deliver → 24h settle",
      speed: "minutes + 24h settle",
      includes: [
        "Same full analysis payload",
        "On-chain job id on the same /jobs receipt",
        "Trustless escrow when policy allows",
      ],
      available: escrowOk,
      reason: escrowOk
        ? undefined
        : "Optional BSC mainnet lock — use Get plan, or Hire with escrow on the agent page.",
    },
  ];
}

export const AGENT_MODEL_VERSION = "genesis-v2-stockanalyst-inspired";
