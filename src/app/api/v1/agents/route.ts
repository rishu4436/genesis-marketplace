import { NextResponse } from "next/server";
import { allGenesisAgents } from "@/lib/genesis-agents";
import { checkAllAgentHealth } from "@/lib/agent-health";
import { listClaims } from "@/lib/seller-claims";
import { LIVE_SELLERS, featuredAsAgent } from "@/lib/third-party-sellers";
import { admitAllSpecialists } from "@/lib/admission";
import { scoreAllSpecialists } from "@/lib/receipt-score";
import {
  DESK,
  DESK_RAILS,
  JOB_SKUS,
  genesisTrustBadges,
  sellerPayloadKind,
  skuForCategory,
  thirdPartyTrustBadges,
} from "@/lib/desk";
import { deskWeek } from "@/lib/desk-metrics";
import { catalogRecordMatchesQuery } from "@/lib/catalog-search";
import { fetchCensusAlive } from "@/lib/census-alive";
import { isCloneBotName, isHireableListing } from "@/lib/hire-class";
import { hireableBscAsAgents, loadHireableBsc } from "@/lib/hireable-bsc";
import { listingPriceForAgent } from "@/lib/listing-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/agents
 * Machine-readable catalog for agent buyers (TermiX-class).
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  const [health, claims, scores, week, census] = await Promise.all([
    checkAllAgentHealth(origin),
    listClaims(20),
    scoreAllSpecialists(),
    deskWeek(),
    fetchCensusAlive(),
  ]);
  const scoreBySlug = Object.fromEntries(scores.map((s) => [s.slug, s]));
  const healthBySlug = Object.fromEntries(health.map((h) => [h.slug, h]));
  const admissionBySlug = Object.fromEntries(
    admitAllSpecialists().map((a) => [a.slug, a]),
  );

  const specialists = allGenesisAgents().map((a) => ({
    type: "genesis_specialist" as const,
    hireClass: "genesis" as const,
    slug: a.slug,
    name: a.name,
    categoryId: a.categoryId,
    job: skuForCategory(a.categoryId)?.job,
    deliverableSchema: "structured-plan" as const,
    proof: skuForCategory(a.categoryId)?.proof,
    priceRail: "L0" as const,
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
    badges: genesisTrustBadges({
      healthHireable: healthBySlug[a.slug]?.hireable !== false,
      admissionAdmitted: admissionBySlug[a.slug]?.grade === "admitted",
    })
      .filter((b) => b.on)
      .map((b) => b.id),
    health: healthBySlug[a.slug]
      ? {
          status: healthBySlug[a.slug].status,
          label: healthBySlug[a.slug].label,
          hireable: healthBySlug[a.slug].hireable,
          version: healthBySlug[a.slug].version,
          identityHash: healthBySlug[a.slug].identityHash,
          checks: healthBySlug[a.slug].checks,
        }
      : null,
    identity: healthBySlug[a.slug]?.identity ?? null,
    admission: admissionBySlug[a.slug]
      ? {
          grade: admissionBySlug[a.slug].grade,
          hireable: admissionBySlug[a.slug].hireable,
          suiteId: admissionBySlug[a.slug].suiteId,
        }
      : null,
    receiptScore: scoreBySlug[a.slug]
      ? {
          composite: scoreBySlug[a.slug].composite,
          sampleSize: scoreBySlug[a.slug].sampleSize,
          version: scoreBySlug[a.slug].version,
          suiteId: scoreBySlug[a.slug].suiteId,
          axes: scoreBySlug[a.slug].axes,
        }
      : null,
  }));

  const liveThird = LIVE_SELLERS.map((s) => {
    const list = listingPriceForAgent(featuredAsAgent(s));
    return {
    type: "live_third_party" as const,
    hireClass: "live" as const,
    slug: s.slug,
    name: s.name,
    categoryId: s.categoryId,
    job: skuForCategory(s.categoryId)?.job,
    deliverableSchema: "structured-plan" as const,
    proof: skuForCategory(s.categoryId)?.proof,
    priceRail: "L0" as const,
    payload: sellerPayloadKind(s),
    tagline: s.tagline,
    chainId: s.chainId,
    tokenId: s.tokenId,
    buyUrl: `${origin}/agents/${s.chainId}/${s.tokenId}#buy`,
    hireApi: `${origin}/api/hire`,
    a2a: s.a2aCardUrl || null,
    rest: s.restBase,
    featured: Boolean(s.featured),
    ...(list?.unit === "U" && list.amount != null
      ? { priceU: list.amount }
      : {}),
    badges: thirdPartyTrustBadges(sellerPayloadKind(s))
      .filter((b) => b.on)
      .map((b) => b.id),
    note:
      sellerPayloadKind(s) === "quote"
        ? "A2A quote only. Not a completed plan until they deliver on-chain."
        : "Not operated by Genesis. Hire returns their A2A quote plus operator report or public measured sample.",
    };
  });

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

  const alive = census.agents
    .filter((a) => !isCloneBotName(a.name, a.description || ""))
    .map((a) => ({
    type: "census_alive" as const,
    hireClass: isHireableListing(a) ? ("live" as const) : ("indexed" as const),
    name: a.name,
    chainId: a.chain_id,
    tokenId: String(a.token_id),
    tagline: a.description?.slice(0, 180) || null,
    a2a: a.a2a_endpoint || null,
    probeStatus: a.probe_status || "alive",
    probeLatencyMs: a.probe_latency_ms ?? null,
    censusCategory: a.census_category || null,
    buyUrl: `${origin}/agents/${a.chain_id}/${a.token_id}`,
    note: isHireableListing(a)
      ? "Endpoint answered a public probe and exposes A2A we can call."
      : "Endpoint answered a public probe. Not a Genesis hire until A2A is public.",
  }));

  const probedLive = hireableBscAsAgents().map((a) => ({
    type: "probed_hireable" as const,
    hireClass: "live" as const,
    name: a.name,
    chainId: a.chain_id,
    tokenId: String(a.token_id),
    categoryId: a.census_category || null,
    tagline: a.description?.slice(0, 180) || null,
    a2a: a.a2a_endpoint || null,
    probeStatus: a.probe_status || "alive",
    buyUrl: `${origin}/agents/${a.chain_id}/${a.token_id}#buy`,
    note: "A2A answered a live probe. Not operated by Genesis.",
  }));

  let data = [
    ...specialists,
    ...liveThird,
    ...claimed,
    ...probedLive,
    ...alive,
  ];
  if (q) {
    data = data.filter((item) => {
      const rec = item as Record<string, unknown>;
      return catalogRecordMatchesQuery(
        {
          name: String(rec.name || ""),
          slug: rec.slug != null ? String(rec.slug) : null,
          tagline: rec.tagline != null ? String(rec.tagline) : null,
          description:
            rec.pitch != null
              ? String(rec.pitch)
              : rec.tagline != null
                ? String(rec.tagline)
                : rec.description != null
                  ? String(rec.description)
                  : null,
          skills: Array.isArray(rec.skills)
            ? rec.skills.map((s) => String(s))
            : null,
          tokenId: rec.tokenId != null ? String(rec.tokenId) : null,
          categoryId: rec.categoryId != null ? String(rec.categoryId) : null,
        },
        q,
      );
    });
  }

  return NextResponse.json({
    success: true,
    marketplace: "Genesis Marketplace",
    version: "1.2",
    desk: DESK,
    rails: DESK_RAILS,
    skus: JOB_SKUS,
    week,
    economy: {
      registered: census.stats.registered,
      endpointAlive: census.stats.alive,
      hireableProbed: hireableBscAsAgents().length,
      byCategory: loadHireableBsc().byCategory,
      hireableOnDesk: specialists.length + liveThird.length,
      source: census.stats.source,
      asOf: census.stats.asOf,
      note: "endpointAlive is a public URL probe. hireableProbed answered A2A. Neither is a Genesis specialist count.",
    },
    query: q || null,
    count: data.length,
    data,
  });
}
