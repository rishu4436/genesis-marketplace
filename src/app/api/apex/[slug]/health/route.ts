import { NextResponse } from "next/server";
import { apexHealthPayload } from "@/lib/apex-health";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const payload = apexHealthPayload(slug);
  if (!payload) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}
