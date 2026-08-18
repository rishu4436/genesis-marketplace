import { NextResponse } from "next/server";
import { listIncidents } from "@/lib/slash-store";
import { coolingPenalty } from "@/lib/job-decision";
import { identityForSlug } from "@/lib/seller-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/slash/:slug — cooling state, not a money slash */
export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const identity = identityForSlug(slug);
  if (!identity) {
    return NextResponse.json(
      { success: false, error: "Unknown specialist" },
      { status: 404 },
    );
  }
  const incidents = await listIncidents(slug);
  const cool = coolingPenalty(incidents, identity.version);
  return NextResponse.json({
    success: true,
    slug,
    hireable: true,
    version: identity.version,
    penalty: cool.penalty,
    open: cool.open,
    why: cool.why,
    incidents: incidents.map((i) => ({
      id: i.id,
      kind: i.kind,
      jobId: i.jobId,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
      weight: i.weight,
    })),
  });
}
