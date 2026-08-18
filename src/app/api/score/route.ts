import { NextResponse } from "next/server";
import { scoreAllSpecialists } from "@/lib/receipt-score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/score — receipt score vectors for Genesis specialists */
export async function GET() {
  const data = await scoreAllSpecialists();
  return NextResponse.json({
    success: true,
    hireable: true,
    count: data.length,
    data,
  });
}
