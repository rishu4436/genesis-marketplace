import { NextResponse } from "next/server";
import { rankGenesisForJob } from "@/lib/job-rank";
import { scoreAllSpecialists } from "@/lib/receipt-score";
import { listIncidents } from "@/lib/slash-store";
import { decorateRankSurface } from "@/lib/rank-surface";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/rank?q= — eligibility-gated organic rank for a job */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q.trim()) {
    return NextResponse.json(
      { success: false, error: "q is required" },
      { status: 400 },
    );
  }
  const [scores, incidents] = await Promise.all([
    scoreAllSpecialists(),
    listIncidents(),
  ]);
  const data = decorateRankSurface(
    rankGenesisForJob(q, scores, undefined, incidents),
  );
  return NextResponse.json({ success: true, data });
}

/** POST /api/rank { q, limit? } */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { q?: string; limit?: number };
    const q = (body.q || "").trim();
    if (!q) {
      return NextResponse.json(
        { success: false, error: "q is required" },
        { status: 400 },
      );
    }
    const [scores, incidents] = await Promise.all([
      scoreAllSpecialists(),
      listIncidents(),
    ]);
    const data = decorateRankSurface(
      rankGenesisForJob(q, scores, body.limit, incidents),
    );
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "rank failed",
      },
      { status: 500 },
    );
  }
}
