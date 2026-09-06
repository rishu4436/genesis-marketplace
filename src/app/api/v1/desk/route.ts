import { NextResponse } from "next/server";
import { DESK, DESK_RAILS, JOB_SKUS } from "@/lib/desk";
import { deskWeek } from "@/lib/desk-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/desk — north-star + job SKUs for machine buyers. */
export async function GET() {
  const week = await deskWeek();
  return NextResponse.json({
    success: true,
    marketplace: "Genesis Marketplace",
    desk: DESK,
    rails: DESK_RAILS,
    skus: JOB_SKUS,
    week,
  });
}
