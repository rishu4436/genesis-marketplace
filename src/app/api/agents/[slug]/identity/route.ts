import { NextResponse } from "next/server";
import { getGenesisAgent } from "@/lib/genesis-agents";
import { checkAgentHealth } from "@/lib/agent-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/agents/:slug/identity — bound identity + honest health */
export async function GET(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const agent = getGenesisAgent(slug);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: "Unknown specialist" },
      { status: 404 },
    );
  }
  const origin = new URL(req.url).origin;
  const health = await checkAgentHealth(agent, origin);
  return NextResponse.json({
    success: true,
    identity: health.identity,
    health: {
      status: health.status,
      label: health.label,
      detail: health.detail,
      hireable: health.hireable,
      checks: health.checks,
      evidence: health.evidence,
    },
    sharePath: `/genesis/${agent.slug}`,
  });
}
