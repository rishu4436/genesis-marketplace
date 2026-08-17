import { NextResponse } from "next/server";
import { getOutcomesSnapshot } from "@/lib/outcomes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/outcomes — marketplace outcomes ledger */
export async function GET() {
  const data = await getOutcomesSnapshot();
  return NextResponse.json({ success: true, data });
}
