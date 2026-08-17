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

export const FEATURED_THIRD_PARTY: ThirdPartySeller = {
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
};

export function isFeaturedThirdParty(
  chainId: number,
  tokenId: string | number,
): boolean {
  return (
    Number(chainId) === FEATURED_THIRD_PARTY.chainId &&
    String(tokenId) === FEATURED_THIRD_PARTY.tokenId
  );
}

export function getFeaturedThirdParty(
  categoryId?: CategoryId | null,
): ThirdPartySeller | null {
  if (categoryId && categoryId !== FEATURED_THIRD_PARTY.categoryId) {
    return null;
  }
  return FEATURED_THIRD_PARTY;
}

export function featuredAsAgent(): Agent {
  const s = FEATURED_THIRD_PARTY;
  return {
    id: `featured:${s.slug}`,
    agent_id: `${s.chainId}:${s.tokenId}`,
    token_id: s.tokenId,
    chain_id: s.chainId,
    owner_address: s.ownerAddress,
    name: s.name,
    description: s.description,
    x402_supported: true,
    supported_protocols: ["A2A", "ERC-8183"],
    a2a_endpoint: s.a2aCardUrl,
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
  if (isFeaturedThirdParty(agent.chain_id, agent.token_id)) {
    return FEATURED_THIRD_PARTY;
  }
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
