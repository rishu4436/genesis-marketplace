import { NextResponse } from "next/server";
import { genesisAgentCard } from "@/lib/apex-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/** A2A agent card — also served at /.well-known/agent-card.json via rewrite */
export async function GET(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const origin = new URL(req.url).origin;
  const card = genesisAgentCard(slug, origin);
  if (!card) {
    return NextResponse.json({ error: "Unknown Genesis agent" }, { status: 404 });
  }
  return NextResponse.json(card, {
    headers: {
      "Cache-Control": "public, max-age=60",
    },
  });
}
