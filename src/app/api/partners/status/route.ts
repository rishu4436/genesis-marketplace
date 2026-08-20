import { NextResponse } from "next/server";
import { probePartners } from "@/lib/partner-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/partners/status — live probes for 8004scan, Altana, TermiX, PCS, featured A2A */
export async function GET() {
  const data = await probePartners();
  return NextResponse.json({
    success: true,
    ...data,
  });
}
