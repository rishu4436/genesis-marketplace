import type { CategoryId } from "./categories";

export type HireIntent = {
  chainId: number;
  tokenId: string;
  agentName?: string;
  categoryId?: CategoryId | null;
  task: string;
  budgetUsd: string;
  duration: "once" | "24h" | "7d" | "30d";
  risk: "low" | "medium" | "high";
  notes?: string;
};

export const DURATION_LABELS: Record<HireIntent["duration"], string> = {
  once: "One-shot task",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

export const RISK_LABELS: Record<HireIntent["risk"], string> = {
  low: "Low — read-only / alerts",
  medium: "Medium — bounded actions",
  high: "High — active trading / LP moves",
};

export const TASK_TEMPLATES: Record<CategoryId, string[]> = {
  rebalancing: [
    "Rebalance PCS V3 NFT #12345 — read ticks from chain, propose fee-first band, do not touch the NFT",
    "Rebalance my PCS V3 CAKE/USDT LP — propose ±6% band, fee APR vs IL, gas budget $2",
    "Reset CAKE-USDT concentrated range around mark with ±5% width and 10% dry powder",
    "PCS V3 BNB/USDT out of range 40% of day — new fee-first bands + execution checklist",
  ],
  "grid-trading": [
    "Design a 12-level geometric grid on BNB/USDT between 0.94 and 1.06 with 6% DD pause",
    "Grid CAKE/USDT with 16 levels, $500 budget, pause if drawdown exceeds 5%",
    "BSC pair grid: 10 levels, geometric spacing, 50/50 inventory, 24h fill sketch",
  ],
  "yield-optimisation": [
    "Best risk-adjusted APR for USDT on BSC under $2000 — lending vs PCS farms, gas <$3",
    "Route idle 5000 USDT: 60% Venus-style lending, satellite farm sleeve, 48h recheck",
    "Compare PCS farm vs lending for USDT under medium risk; propose split and IL stops",
  ],
  "health-factor": [
    "Venus HF ≈ 1.45 — simulate −15% collateral shock; repay vs add-collateral ladder",
    "Health factor protection: soft alert 1.30, hard 1.20, −20% collateral stress test",
    "Aave-style loan on BSC — HF plan after −10% and −15% collateral drops with sizing",
  ],
};

/** Always available so every listed agent is hireable */
export const GENERIC_TASK_TEMPLATES: string[] = [
  "Summarize what you can do for my BSC wallet and positions",
  "Propose a one-shot job plan given my notes and budget",
  "Review risks and next actions for my DeFi setup on BNB Chain",
];

export function taskTemplatesFor(categoryId?: CategoryId | null): string[] {
  if (categoryId && TASK_TEMPLATES[categoryId]?.length) {
    return TASK_TEMPLATES[categoryId];
  }
  return GENERIC_TASK_TEMPLATES;
}

export function defaultTaskForCategory(categoryId?: CategoryId | null): string {
  return taskTemplatesFor(categoryId)[0];
}
