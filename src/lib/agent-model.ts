/**
 * Genesis Agent Model v2 — commerce and reports for four DeFi job SKUs.
 *
 *  - Free scan / full plan / optional escrow
 *  - Buyer context (risk)
 *  - Multi-source analysis + structured report
 *  - Job-first discovery, specialist matching, shareable jobs
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
      label: "Plan",
      short: "Plan",
      costLabel: "SKU $ · plan · no charge",
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
      label: "Escrow",
      short: "Escrow",
      costLabel: "Listed $U lock from the agent page (SKU ÷ 100 on Genesis)",
      settlement: "Optional ERC-8183 fund → deliver → settle after dispute window",
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

export const AGENT_MODEL_VERSION = "genesis-v2";
