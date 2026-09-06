/**
 * Third-party (not By Genesis) sellers we can actually reach.
 * Featured pin is the judge-proof hire. Other catalog agents may
 * resolve from 8004scan a2a_endpoint at hire time.
 */

import type { CategoryId } from "./categories";
import type { Agent } from "./types";

export type ThirdPartySeller = {
  slug: string;
  name: string;
  chainId: number;
  tokenId: string;
  categoryId: CategoryId;
  tagline: string;
  description: string;
  a2aCardUrl: string;
  restBase?: string;
  ownerAddress: string;
  featured?: boolean;
};

export const FEATURED_SELLERS: ThirdPartySeller[] = [
  {
    slug: "bnb-lp-rebalancer",
    name: "BNB LP Range Rebalancer",
    chainId: 56,
    tokenId: "265375",
    categoryId: "rebalancing",
    tagline: "Live PCS V3 BNB/USDT rebalancer · A2A + operator API",
    description:
      "Autonomous PancakeSwap V3 BNB/USDT concentrated-liquidity range rebalancer. Sells live position reports over A2A + ERC-8183.",
    a2aCardUrl:
      "https://bnb-lp.172-104-171-139.nip.io/.well-known/agent-card.json",
    restBase: "https://bnb-lp-api.172-104-171-139.nip.io",
    ownerAddress: "0x20f1ca5d1e5a3ee94c29dbf95e6bf6cea6a8d64b",
    featured: true,
  },
  {
    slug: "brain-grid-planner",
    name: "Brain on BNB — BSC Grid Planner",
    chainId: 56,
    tokenId: "302258",
    categoryId: "grid-trading",
    tagline: "Grid spacing from pool fees, impact, and transfer tax",
    description:
      "Sizes a grid for a BNB Chain pool against swap fee, price impact, and transfer tax. Hireable over ERC-8183.",
    a2aCardUrl: "https://brainonbnb.com/.well-known/agent-card.json",
    ownerAddress: "",
    featured: true,
  },
  {
    slug: "defi-market-engine-yield",
    name: "defi-market-engine.agent",
    chainId: 56,
    tokenId: "332316",
    categoryId: "yield-optimisation",
    tagline: "BSC DeFi engine · yield + four official jobs",
    description:
      "AI agent for BSC DeFi: rebalancing, grid trading, yield optimization, health-factor monitoring.",
    a2aCardUrl: "",
    ownerAddress: "",
    featured: true,
  },
  {
    slug: "defi-market-engine-health",
    name: "defi-market-engine.agent",
    chainId: 56,
    tokenId: "332318",
    categoryId: "health-factor",
    tagline: "BSC DeFi engine · health-factor path",
    description:
      "AI agent for BSC DeFi: rebalancing, grid trading, yield optimization, health-factor monitoring.",
    a2aCardUrl: "",
    ownerAddress: "",
    featured: true,
  },
];

/** Backward-compat: featured rebalancing outsider used by partner probes. */
export const FEATURED_THIRD_PARTY: ThirdPartySeller = FEATURED_SELLERS[0]!;

export function isFeaturedThirdParty(
  chainId: number,
  tokenId: string | number,
): boolean {
  const t = String(tokenId);
  return FEATURED_SELLERS.some(
    (s) => Number(chainId) === s.chainId && String(s.tokenId) === t,
  );
}

export function getFeaturedThirdParty(
  categoryId?: CategoryId | null,
): ThirdPartySeller | null {
  if (!categoryId) return FEATURED_THIRD_PARTY;
  return FEATURED_SELLERS.find((s) => s.categoryId === categoryId) ?? null;
}

export function featuredAsAgent(seller?: ThirdPartySeller | null): Agent {
  const s = seller || FEATURED_THIRD_PARTY;
  return {
    id: `featured:${s.slug}`,
    agent_id: `${s.chainId}:${s.tokenId}`,
    token_id: s.tokenId,
    chain_id: s.chainId,
    owner_address: s.ownerAddress,
    name: s.name,
    description: s.description,
    x402_supported: Boolean(s.a2aCardUrl && s.slug === "bnb-lp-rebalancer"),
    supported_protocols: ["A2A", "ERC-8183"],
    a2a_endpoint: s.a2aCardUrl || undefined,
    total_score: 25,
    health_score: 100,
  };
}

export function a2aRpcUrl(cardOrRpc: string): string {
  return cardOrRpc
    .replace(/\/\.well-known\/agent-card\.json\/?$/i, "/")
    .replace(/\/?$/, "/");
}

export function sellerFromAgent(agent: Agent): ThirdPartySeller | null {
  const featured = FEATURED_SELLERS.find(
    (s) =>
      Number(s.chainId) === Number(agent.chain_id) &&
      String(s.tokenId) === String(agent.token_id),
  );
  if (featured) return featured;
  const card = agent.a2a_endpoint?.trim();
  if (!card) return null;
  const rest =
    agent.description?.match(/https?:\/\/[^\s]+-api\.[^\s]+/i)?.[0] ||
    undefined;
  return {
    slug: `idx-${agent.chain_id}-${agent.token_id}`,
    name: agent.name || `Agent #${agent.token_id}`,
    chainId: agent.chain_id,
    tokenId: String(agent.token_id),
    categoryId: "rebalancing",
    tagline: "Indexed seller with a live A2A endpoint",
    description: agent.description || "",
    a2aCardUrl: card,
    restBase: rest?.replace(/[).,]+$/, ""),
    ownerAddress: agent.owner_address || "",
  };
}

export function thirdPartyHref(s: ThirdPartySeller) {
  return `/agents/${s.chainId}/${s.tokenId}`;
}

export function thirdPartyBuyHref(s: ThirdPartySeller, opts?: { buy?: boolean }) {
  const q = opts?.buy ? "?buy=1" : "";
  return `/agents/${s.chainId}/${s.tokenId}${q}#buy`;
}
