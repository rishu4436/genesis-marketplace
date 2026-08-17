import { NextResponse } from "next/server";
import { listJobs, saveJob } from "@/lib/job-store";
import type { HireJob } from "@/lib/hire-engine";

export const runtime = "nodejs";

/** GET /api/jobs — recent durable jobs */
export async function GET() {
  const jobs = await listJobs(40);
  return NextResponse.json({ success: true, data: jobs });
}

/** POST /api/jobs — persist a hire job for share links */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { job?: HireJob };
    if (!body.job?.id) {
      return NextResponse.json(
        { success: false, error: "job with id required" },
        { status: 400 },
      );
    }
    const saved = await saveJob(body.job);
    return NextResponse.json({
      success: true,
      data: saved,
      sharePath: `/jobs/${encodeURIComponent(saved.id)}`,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "save failed",
      },
      { status: 500 },
    );
  }
}
