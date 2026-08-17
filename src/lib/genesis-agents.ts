import type { CategoryId } from "./categories";
import type { Agent } from "./types";
import { getPin } from "./pins";

/**
 * Marketplace specialists operated by Genesis — one per job category so hire
 * always has a working path. Pins (tokenId / serviceUrl) from config/pins.json.
 */
export type GenesisAgent = {
  slug: string;
  categoryId: CategoryId;
  name: string;
  tagline: string;
  description: string;
  skills: string[];
  protocols: string[];
  x402: boolean;
  pcsRelated: boolean;
  basePriceUsd: number;
  etaMinutes: number;
  riskDefault: "low" | "medium" | "high";
  chainId?: number;
  tokenId?: string;
  serviceUrl?: string;
  accent: string;
  icon: string;
  studioPrompt: string;
};

export const GENESIS_AGENTS: GenesisAgent[] = [
  {
    slug: "range-keeper",
    categoryId: "rebalancing",
    name: "RangeKeeper",
    tagline: "PCS V3 LP ranges that stay in the money",
    description:
      "Marketplace specialist for concentrated liquidity (built by Genesis). Monitors PancakeSwap V3 positions, flags out-of-range liquidity, and proposes rebalance bands with fee APR vs IL context. Does not custody user funds — delivers actionable plans.",
    skills: [
      "PCS V3 range monitor",
      "Rebalance band proposal",
      "Fee APR vs IL snapshot",
      "Gas-aware reset plan",
    ],
    protocols: ["ERC-8183", "x402", "Web"],
    x402: true,
    pcsRelated: true,
    basePriceUsd: 8,
    etaMinutes: 2,
    riskDefault: "medium",
    accent: "from-amber-400 to-orange-500",
    icon: "◎",
    studioPrompt:
      "Create a BNB Agent Studio seller named RangeKeeper on bsc-testnet that sells PancakeSwap V3 LP rebalance plans. On fulfill, analyze range health, propose new bands, fee APR vs IL notes. No fund custody. ERC-8183 commerce + x402 for LLM. min/max price around $5–$20.",
  },
  {
    slug: "gridwright",
    categoryId: "grid-trading",
    name: "Gridwright",
    tagline: "Automated grid plans on BSC pairs",
    description:
      "Marketplace specialist for grid trading (built by Genesis). Designs multi-level grids between user bounds, sizes notional per level, and returns pause rules for drawdown. You keep execution — Gridwright delivers the strategy brief.",
    skills: [
      "Grid layout (N levels)",
      "Drawdown pause rules",
      "24h fill simulation",
      "Pair volatility bands",
    ],
    protocols: ["ERC-8183", "x402", "Web"],
    x402: true,
    pcsRelated: true,
    basePriceUsd: 10,
    etaMinutes: 3,
    riskDefault: "medium",
    accent: "from-sky-400 to-blue-600",
    icon: "▦",
    studioPrompt:
      "Create a BNB Agent Studio seller named Gridwright on bsc-testnet that sells grid trading layouts for BSC pairs. On fulfill, return N-level grid, spacing, pause DD rules, and 24h fill simulation. No custody. ERC-8183 + x402.",
  },
  {
    slug: "yield-router",
    categoryId: "yield-optimisation",
    name: "YieldRouter",
    tagline: "Route stable liquidity to stronger APR",
    description:
      "Marketplace specialist for yield routes on BSC (built by Genesis). Compares venue APR for an asset, scores risk bands, and proposes a reallocation under a gas budget. Read-first; no fund custody.",
    skills: [
      "Multi-venue APR scan",
      "Risk-banded ranking",
      "Gas-budget reallocation",
      "PCS farm awareness",
    ],
    protocols: ["ERC-8183", "x402", "Web"],
    x402: true,
    pcsRelated: true,
    basePriceUsd: 7,
    etaMinutes: 2,
    riskDefault: "low",
    accent: "from-emerald-400 to-teal-600",
    icon: "▲",
    studioPrompt:
      "Create a BNB Agent Studio seller named YieldRouter on bsc-testnet that sells yield reallocation briefs for BSC (including PancakeSwap farms). Rank venues by risk-adjusted APR, propose splits under gas budget. No custody. ERC-8183 + x402.",
  },
  {
    slug: "health-sentinel",
    categoryId: "health-factor",
    name: "HealthSentinel",
    tagline: "Protect loans before liquidation",
    description:
      "Marketplace specialist for lending health (built by Genesis). Simulates health-factor under collateral shocks, suggests repay vs add-collateral options, and drafts alert thresholds. Advisory only — not a custodian.",
    skills: [
      "HF simulation",
      "Liquidation distance",
      "Repay vs collateral options",
      "Alert threshold plan",
    ],
    protocols: ["ERC-8183", "x402", "Web"],
    x402: true,
    pcsRelated: false,
    basePriceUsd: 6,
    etaMinutes: 2,
    riskDefault: "low",
    accent: "from-rose-400 to-red-600",
    icon: "✚",
    studioPrompt:
      "Create a BNB Agent Studio seller named HealthSentinel on bsc-testnet that sells lending health-factor protection plans (Venus/Aave-style on BSC). Simulate shocks, alert thresholds, repay vs collateral options. No custody. ERC-8183 + x402.",
  },
];

function appBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function getGenesisAgent(slug: string): GenesisAgent | undefined {
  const base = GENESIS_AGENTS.find((a) => a.slug === slug);
  if (!base) return undefined;
  const pin = getPin(slug);
  const external = pin.serviceUrl?.replace(/\/$/, "");
  const serviceUrl =
    external || `${appBaseUrl()}/api/apex/${slug}`;

  return {
    ...base,
    chainId: pin.chainId || base.chainId || 56,
    tokenId: pin.tokenId || base.tokenId,
    serviceUrl,
  };
}

export function getGenesisAgentsByCategory(categoryId: CategoryId): GenesisAgent[] {
  return GENESIS_AGENTS.filter((a) => a.categoryId === categoryId)
    .map((a) => getGenesisAgent(a.slug)!)
    .filter(Boolean);
}

export function allGenesisAgents(): GenesisAgent[] {
  return GENESIS_AGENTS.map((a) => getGenesisAgent(a.slug)!).filter(Boolean);
}

export function isGenesisSlug(slug: string): boolean {
  return GENESIS_AGENTS.some((a) => a.slug === slug);
}

export function genesisToAgentCard(g: GenesisAgent): Agent & {
  genesis_slug: string;
  genesis_verified: true;
} {
  const chainId = g.chainId ?? 56;
  return {
    id: `genesis:${g.slug}`,
    agent_id: g.tokenId ? `${chainId}:${g.tokenId}` : `genesis:${g.slug}`,
    token_id: g.tokenId || g.slug,
    chain_id: chainId,
    name: g.name,
    description: g.description,
    image_url: null,
    is_verified: true,
    supported_protocols: g.protocols,
    x402_supported: g.x402,
    created_at: "2026-08-05T00:00:00Z",
    genesis_slug: g.slug,
    genesis_verified: true,
  };
}

export function genesisHref(g: GenesisAgent) {
  return `/genesis/${g.slug}`;
}

/** Query before hash so HireWizard can read task / auto-buy. */
export function genesisBuyHref(
  g: GenesisAgent,
  opts?: { task?: string; buy?: boolean },
) {
  const p = new URLSearchParams();
  if (opts?.task?.trim()) p.set("task", opts.task.trim());
  if (opts?.buy) p.set("buy", "1");
  const q = p.toString();
  return `/genesis/${g.slug}${q ? `?${q}` : ""}#buy`;
}
