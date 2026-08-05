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
    "Monitor my PCS V3 LP and suggest rebalance when out of range",
    "Reset LP range around current price with ±X% width",
    "Report fee APR vs IL for my position over last 7 days",
  ],
  "grid-trading": [
    "Run a grid between low and high with N levels on BSC pair",
    "Pause grid if drawdown exceeds X%",
    "Summarize filled grid orders and PnL for last 24h",
  ],
  "yield-optimisation": [
    "Find highest safe APR venues for USDT on BSC",
    "Compare yield on PCS farms vs lending for my asset",
    "Propose a reallocation plan under $Y gas budget",
  ],
  "health-factor": [
    "Watch my Venus/Aave health factor and alert below 1.3",
    "Simulate HF after price drop of X% on collateral",
    "Suggest repay vs add-collateral options before liquidation",
  ],
};

export function defaultTaskForCategory(categoryId?: CategoryId | null): string {
  if (!categoryId) return "Describe the job you want this agent to run on BSC.";
  return TASK_TEMPLATES[categoryId][0];
}
