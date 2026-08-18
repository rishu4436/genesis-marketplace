import { NextResponse } from "next/server";
import { featuredSlotsForJob } from "@/lib/featured-slots";
import { getCategory } from "@/lib/categories";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/featured?category=rebalancing */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("category") || "";
  const cat = getCategory(raw)?.id ?? null;
  const data = featuredSlotsForJob(cat);
  return NextResponse.json({
    success: true,
    organic: false,
    paidRank: false,
    data,
  });
}
