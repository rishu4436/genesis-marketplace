import { NextResponse } from "next/server";
import { checkAllAgentHealth } from "@/lib/agent-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/agents/health — live probes for all Genesis specialists */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const health = await checkAllAgentHealth(origin);
  return NextResponse.json({
    success: true,
    data: health,
    checkedAt: new Date().toISOString(),
  });
}
