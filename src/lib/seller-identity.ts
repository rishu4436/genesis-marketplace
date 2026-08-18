/**
 * Bound seller identity.
 *
 * A listing name is not an identity. Identity is controller + ERC-8004
 * token + runtime version + capabilities + mandate. Swap the token or
 * the controller and the hash changes. Version bumps are explicit.
 *
 * Hackathon rails: specialists stay hireable even when the Studio
 * platform trial is dead. Identity does not unlist them.
 */

import { createHash } from "crypto";
import type { CategoryId } from "./categories";
import {
  type JobMandate,
  canonicalize,
  mandateFor,
  sellerIdOf,
  sellerIdentityVersion,
} from "./job-spec";
import { getGenesisAgent, type GenesisAgent } from "./genesis-agents";
import { getPin } from "./pins";

export const SELLER_IDENTITY_VERSION = 1 as const;

export type SellerIdentity = {
  schemaVersion: typeof SELLER_IDENTITY_VERSION;
  sellerId: string;
  controller: string | null;
  chainId: number;
  tokenId: string | null;
  erc8004: boolean;
  runtime: {
    kind: "apex" | "platform" | "none";
    healthPath: string;
    serviceUrl?: string;
  };
  version: string;
  engine: string;
  categoryId: CategoryId | null;
  capabilities: string[];
  mandate: JobMandate;
  identityHash: string;
};

export type IdentityCanon = {
  sellerId: string;
  controller: string | null;
  chainId: number;
  tokenId: string | null;
  version: string;
  categoryId: CategoryId | null;
  capabilities: string[];
  mandate: JobMandate;
};

export function hashIdentity(canon: IdentityCanon): string {
  return createHash("sha256")
    .update(
      canonicalize({
        ...canon,
        capabilities: [...canon.capabilities].sort(),
      }),
      "utf8",
    )
    .digest("hex");
}

export function identityFromGenesis(
  agent: GenesisAgent,
  origin?: string,
): SellerIdentity {
  const pin = getPin(agent.slug);
  const tokenId = pin.tokenId || agent.tokenId || null;
  const chainId = pin.chainId || agent.chainId || 56;
  const controller = pin.walletAddress?.trim() || null;
  const version = sellerIdentityVersion({
    genesisSlug: agent.slug,
    tokenId: tokenId || `genesis:${agent.slug}`,
    chainId,
  });
  const sellerId = sellerIdOf({
    genesisSlug: agent.slug,
    chainId,
    tokenId: tokenId || `genesis:${agent.slug}`,
  });
  const mandate = mandateFor(agent.categoryId);
  const capabilities = [...agent.skills].sort();
  const identityHash = hashIdentity({
    sellerId,
    controller,
    chainId,
    tokenId,
    version,
    categoryId: agent.categoryId,
    capabilities,
    mandate,
  });

  const base = origin?.replace(/\/$/, "") || "";
  const healthPath = `${base}/api/apex/${agent.slug}/health`;

  return {
    schemaVersion: 1,
    sellerId,
    controller,
    chainId,
    tokenId,
    erc8004: Boolean(tokenId && /^\d+$/.test(tokenId)),
    runtime: {
      kind: "apex",
      healthPath,
      serviceUrl: agent.serviceUrl,
    },
    version,
    engine: version.split("@")[1] || version,
    categoryId: agent.categoryId,
    capabilities,
    mandate,
    identityHash,
  };
}

export function identityForSlug(
  slug: string,
  origin?: string,
): SellerIdentity | null {
  const agent = getGenesisAgent(slug);
  if (!agent) return null;
  return identityFromGenesis(agent, origin);
}

export function identityHashForSeller(input: {
  genesisSlug?: string;
  chainId: number;
  tokenId: string;
  categoryId?: CategoryId | null;
  capabilities?: string[];
}): string | null {
  if (input.genesisSlug) {
    const id = identityForSlug(input.genesisSlug);
    return id?.identityHash ?? null;
  }
  const sellerId = sellerIdOf(input);
  const version = sellerIdentityVersion(input);
  return hashIdentity({
    sellerId,
    controller: null,
    chainId: input.chainId,
    tokenId: input.tokenId,
    version,
    categoryId: input.categoryId ?? null,
    capabilities: [...(input.capabilities || [])].sort(),
    mandate: mandateFor(input.categoryId),
  });
}

export function shortHex(hex: string | null | undefined, keep = 12): string {
  if (!hex) return "—";
  if (hex.length <= keep + 8) return hex;
  return `${hex.slice(0, keep)}…${hex.slice(-8)}`;
}
