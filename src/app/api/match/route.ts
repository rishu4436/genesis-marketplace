import { NextResponse } from "next/server";
import { matchAgentsForJob } from "@/lib/intent-match";

export const runtime = "nodejs";

/** POST /api/match — job brief → ranked Genesis agents */
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
    const result = matchAgentsForJob(q, body.limit ?? 3);
    return NextResponse.json({ success: true, data: result });
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
