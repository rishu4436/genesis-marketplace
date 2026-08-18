import { NextResponse } from "next/server";
import { admitAllSpecialists } from "@/lib/admission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admission — suite results for all Genesis specialists */
export async function GET() {
  const data = admitAllSpecialists();
  return NextResponse.json({
    success: true,
    hireable: true,
    count: data.length,
    data,
  });
}
