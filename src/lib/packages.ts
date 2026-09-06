/**
 * Multi-agent job packages — one cart, several specialists.
 */

import type { CategoryId } from "./categories";
import { allGenesisAgents } from "./genesis-agents";

export type JobPackage = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Genesis slugs in order */
  agentSlugs: string[];
  tasks: Record<string, string>;
  accent: string;
};

export const JOB_PACKAGES: JobPackage[] = [
  {
    id: "defi-ops-desk",
    name: "DeFi ops desk",
    tagline: "Rebalance + yield + risk in one pass",
    description:
      "Run three specialists on linked briefs: LP range health, USDT yield route, and HF shock — one L0 run, three plans. No payment.",
    agentSlugs: ["range-keeper", "yield-router", "health-sentinel"],
    tasks: {
      "range-keeper":
        "Check PCS V3 LP range health and propose rebalance bands with fee APR vs IL notes",
      "yield-router":
        "Find best risk-adjusted yield for idle USDT on BSC under a modest gas budget",
      "health-sentinel":
        "Simulate HF after −15% collateral shock; repay vs add-collateral ladder",
    },
    accent: "from-amber-400 to-orange-500",
  },
  {
    id: "trader-kit",
    name: "Trader kit",
    tagline: "Grid + yield for active BSC books",
    description:
      "Grid layout plus yield parking for unused inventory — plan-only, no custody.",
    agentSlugs: ["gridwright", "yield-router"],
    tasks: {
      gridwright:
        "Design a 12-level geometric grid on a major BSC pair with DD pause rules",
      "yield-router":
        "Park unused USDT in safest high-APR venues while the grid runs",
    },
    accent: "from-sky-400 to-blue-600",
  },
  {
    id: "lp-full-stack",
    name: "LP full stack",
    tagline: "PancakeSwap LP + farm yield",
    description:
      "PCS-aware rebalance plan and yield reallocation for LP-adjacent capital.",
    agentSlugs: ["range-keeper", "yield-router"],
    tasks: {
      "range-keeper":
        "PCS V3 rebalance plan for concentrated liquidity with gas-aware reset",
      "yield-router":
        "Compare PCS farms vs lending for leftover inventory after rebalance",
    },
    accent: "from-violet-400 to-fuchsia-500",
  },
];

export function getPackage(id: string): JobPackage | undefined {
  return JOB_PACKAGES.find((p) => p.id === id);
}

export function packagePricing(pkg: JobPackage) {
  const agents = allGenesisAgents().filter((a) =>
    pkg.agentSlugs.includes(a.slug),
  );
  const subtotal = agents.reduce((s, a) => s + a.basePriceUsd, 0);
  const bundleDiscount = Math.round(subtotal * 0.15 * 100) / 100;
  const total = Math.round((subtotal - bundleDiscount) * 100) / 100;
  const etaMax = Math.max(...agents.map((a) => a.etaMinutes), 2);
  return { agents, subtotal, bundleDiscount, total, etaMax };
}

export function packagesForCategory(categoryId: CategoryId): JobPackage[] {
  return JOB_PACKAGES.filter((p) => {
    const agents = allGenesisAgents().filter((a) =>
      p.agentSlugs.includes(a.slug),
    );
    return agents.some((a) => a.categoryId === categoryId);
  });
}
