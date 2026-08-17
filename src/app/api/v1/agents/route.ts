import { NextResponse } from "next/server";
import { allGenesisAgents } from "@/lib/genesis-agents";
import { checkAllAgentHealth } from "@/lib/agent-health";
import { listClaims } from "@/lib/seller-claims";
import { FEATURED_THIRD_PARTY } from "@/lib/third-party-sellers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/agents
 * Machine-readable catalog for agent buyers (TermiX-class).
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const [health, claims] = await Promise.all([
    checkAllAgentHealth(origin),
    listClaims(20),
  ]);
  const healthBySlug = Object.fromEntries(health.map((h) => [h.slug, h]));

  const specialists = allGenesisAgents().map((a) => ({
    type: "genesis_specialist" as const,
    hireClass: "genesis" as const,
    slug: a.slug,
    name: a.name,
    categoryId: a.categoryId,
    tagline: a.tagline,
    skills: a.skills,
    protocols: a.protocols,
    x402: a.x402,
    priceUsd: a.basePriceUsd,
    etaMinutes: a.etaMinutes,
    chainId: a.chainId ?? 56,
    tokenId: a.tokenId,
    buyUrl: `${origin}/genesis/${a.slug}#buy`,
    hireApi: `${origin}/api/hire`,
    health: healthBySlug[a.slug]
      ? {
          status: healthBySlug[a.slug].status,
          label: healthBySlug[a.slug].label,
        }
      : null,
  }));

  const liveThird = {
    type: "live_third_party" as const,
    hireClass: "live" as const,
    slug: FEATURED_THIRD_PARTY.slug,
    name: FEATURED_THIRD_PARTY.name,
    categoryId: FEATURED_THIRD_PARTY.categoryId,
    tagline: FEATURED_THIRD_PARTY.tagline,
    chainId: FEATURED_THIRD_PARTY.chainId,
    tokenId: FEATURED_THIRD_PARTY.tokenId,
    buyUrl: `${origin}/agents/${FEATURED_THIRD_PARTY.chainId}/${FEATURED_THIRD_PARTY.tokenId}?buy=1#buy`,
    hireApi: `${origin}/api/hire`,
    a2a: FEATURED_THIRD_PARTY.a2aCardUrl,
    rest: FEATURED_THIRD_PARTY.restBase,
    note: "Not operated by Genesis. Hire returns their quote + operator report.",
  };

  const claimed = claims.map((c) => ({
    type: "claimed_listing" as const,
    id: c.id,
    name: c.displayName,
    chainId: c.chainId,
    tokenId: c.tokenId,
    skills: c.skills,
    x402: c.x402,
    priceUsd: c.priceUsd,
    pitch: c.pitch,
    buyUrl: `${origin}/agents/${c.chainId}/${c.tokenId}#buy`,
  }));

  return NextResponse.json({
    success: true,
    marketplace: "Genesis Marketplace",
    version: "1",
    count: specialists.length + 1 + claimed.length,
    data: [...specialists, liveThird, ...claimed],
  });
}
