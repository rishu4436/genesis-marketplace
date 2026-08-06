import { NextResponse } from "next/server";
import { getGenesisAgent } from "@/lib/genesis-agents";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const agent = getGenesisAgent(slug);
  if (!agent) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    status: "ok",
    service: "erc8183-service (genesis)",
    keyless: true,
    agent: agent.name,
    slug,
  });
}
