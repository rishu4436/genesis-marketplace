import { NextResponse } from "next/server";
import { allGenesisAgents } from "@/lib/genesis-agents";
import { checkAllAgentHealth } from "@/lib/agent-health";
import { listClaims } from "@/lib/seller-claims";
import { LIVE_SELLERS } from "@/lib/third-party-sellers";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/agents
 * Machine-readable catalog for agent buyers (TermiX-class).
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  const [health, claims, scores, week] = await Promise.all([
    checkAllAgentHealth(origin),
    listClaims(20),
    scoreAllSpecialists(),
    deskWeek(),
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

  const liveThird = LIVE_SELLERS.map((s) => ({
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
    badges: thirdPartyTrustBadges(sellerPayloadKind(s))
      .filter((b) => b.on)
      .map((b) => b.id),
    note:
      sellerPayloadKind(s) === "quote"
        ? "A2A quote only. Not a completed plan until they deliver on-chain."
        : "Not operated by Genesis. Hire returns their A2A quote plus operator report or public measured sample.",
  }));

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

  let data = [...specialists, ...liveThird, ...claimed];
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
    version: "1.1",
    desk: DESK,
    rails: DESK_RAILS,
    skus: JOB_SKUS,
    week,
    query: q || null,
    count: data.length,
    data,
  });
}
