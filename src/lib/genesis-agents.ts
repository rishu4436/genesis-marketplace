import type { CategoryId } from "./categories";
import type { Agent } from "./types";
import { BSC_MAINNET_CHAIN_ID, getPin } from "./pins";
import { siteUrl } from "./site-url";

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
    protocols: ["ERC-8183", "Web"],
    x402: false,
    pcsRelated: true,
    basePriceUsd: 8,
    etaMinutes: 2,
    riskDefault: "medium",
    accent: "from-amber-400 to-orange-500",
    icon: "◎",
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
    protocols: ["ERC-8183", "Web"],
    x402: false,
    pcsRelated: true,
    basePriceUsd: 10,
    etaMinutes: 3,
    riskDefault: "medium",
    accent: "from-sky-400 to-blue-600",
    icon: "▦",
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
    protocols: ["ERC-8183", "Web"],
    x402: false,
    pcsRelated: true,
    basePriceUsd: 7,
    etaMinutes: 2,
    riskDefault: "low",
    accent: "from-emerald-400 to-teal-600",
    icon: "▲",
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
    protocols: ["ERC-8183", "Web"],
    x402: false,
    pcsRelated: false,
    basePriceUsd: 6,
    etaMinutes: 2,
    riskDefault: "low",
    accent: "from-rose-400 to-red-600",
    icon: "✚",
  },
];

function appBaseUrl(): string {
  return siteUrl();
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
    chainId: BSC_MAINNET_CHAIN_ID,
    tokenId: pin.tokenId || undefined,
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

export function genesisToAgentCard(
  g: GenesisAgent,
  opts?: { receiptFit?: number },
): Agent & {
  genesis_slug: string;
  genesis_verified: true;
  genesis_fit?: number;
} {
  const chainId = BSC_MAINNET_CHAIN_ID;
  const pin = getPin(g.slug);
  return {
    id: `genesis:${g.slug}`,
    agent_id: g.tokenId ? `${chainId}:${g.tokenId}` : `genesis:${g.slug}`,
    token_id: g.tokenId || g.slug,
    chain_id: chainId,
    owner_address: pin.walletAddress || undefined,
    name: g.name,
    description: g.description,
    image_url: null,
    is_verified: true,
    supported_protocols: g.protocols,
    x402_supported: g.x402,
    health_score: 100,
    created_at: "2026-08-05T00:00:00Z",
    genesis_slug: g.slug,
    genesis_verified: true,
    genesis_fit: opts?.receiptFit,
  };
}

export function genesisHref(g: GenesisAgent) {
  return `/genesis/${g.slug}`;
}

/** Header / landing Hire — catalog, not a featured promo floor. */
export const HIRE_NOW_HREF = "/browse";

/**
 * Query before hash so HireWizard can read task.
 * `buy=1` auto-starts a hire in HireWizard. Recommendation and /judge CTAs
 * must omit it so Get plan / Soft hire is an explicit click.
 */
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

/** True when a listing href would auto-POST /api/hire via HireWizard. */
export function hrefAutoHires(href: string): boolean {
  const path = href.split("#")[0] || href;
  return /(?:\?|&)buy=1(?:&|$)/.test(path);
}
