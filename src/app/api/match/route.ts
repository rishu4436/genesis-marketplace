import { NextResponse } from "next/server";
import { listingToMatchShape, rankGenesisForJob } from "@/lib/job-rank";
import { scoreAllSpecialists } from "@/lib/receipt-score";
import { listIncidents } from "@/lib/slash-store";

export const runtime = "nodejs";

/** POST /api/match — job brief → eligibility-gated organic rank */
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
    const ranked = rankGenesisForJob(q, scores, body.limit ?? 3, incidents);
    return NextResponse.json({
      success: true,
      data: {
        categoryId: ranked.categoryId,
        categoryName: ranked.categoryName,
        matches: ranked.organic.map((row) =>
          listingToMatchShape(row, ranked.task),
        ),
        excluded: ranked.excluded,
        normalizedTask: ranked.task,
        paidRank: false,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "match failed",
      },
      { status: 500 },
    );
  }
}
