import { NextResponse } from "next/server";
import { scoreSeller } from "@/lib/receipt-score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/score/:slug */
export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const score = await scoreSeller(slug);
  if (!score) {
    return NextResponse.json(
      { success: false, error: "Unknown specialist" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, hireable: true, data: score });
}
