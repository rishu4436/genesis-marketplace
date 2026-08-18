import { NextResponse } from "next/server";
import { admitSlug } from "@/lib/admission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/admission/:slug */
export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const report = admitSlug(slug);
  if (!report) {
    return NextResponse.json(
      { success: false, error: "Unknown specialist" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    success: true,
    hireable: true,
    data: report,
  });
}
