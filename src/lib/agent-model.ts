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
      label: "Full analysis",
      short: "Full",
      costLabel: "Listed $ (soft settle)",
      settlement: "Marketplace soft purchase · deliverable unlocked",
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
      label: "On-chain escrow",
      short: "Escrow",
      costLabel: "0.21+ U (when live)",
      settlement: "ERC-8183 fund → deliver → 24h settle",
      speed: "minutes + 24h settle",
      includes: [
        "Same full analysis payload",
        "On-chain job id path via /fund",
        "Trustless escrow when policy allows",
      ],
      available: escrowOk,
      reason: escrowOk
        ? undefined
        : "BSC testnet policy not whitelisted — use Full analysis",
    },
  ];
}

export const AGENT_MODEL_VERSION = "genesis-v2-stockanalyst-inspired";
