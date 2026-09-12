import { NextResponse } from "next/server";
import { findJobReceipt, getJob, listJobs, saveJob } from "@/lib/job-store";
import type { HireJob } from "@/lib/hire-engine";
import { currentAccount } from "@/lib/session";

export const runtime = "nodejs";

/** GET /api/jobs — recent jobs, or ?claim= / ?q= to recover a receipt */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("claim") || url.searchParams.get("q") || "").trim();
  if (q) {
    const job = await findJobReceipt(q);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "No hire found for that receipt" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: job });
  }
  const acc = await currentAccount();
  if (!acc) {
    return NextResponse.json(
      { success: false, error: "Sign in required" },
      { status: 401 },
    );
  }
  const jobs = (await listJobs(80)).filter((j) => j.ownerId === acc.id);
  return NextResponse.json({ success: true, data: jobs });
}

/** POST /api/jobs — persist a hire job for share links */
export async function POST(req: Request) {
  try {
    const acc = await currentAccount();
    if (!acc) {
      return NextResponse.json(
        { success: false, error: "Sign in required to save a hire" },
        { status: 401 },
      );
    }
    const body = (await req.json()) as { job?: HireJob };
    if (!body.job?.id) {
      return NextResponse.json(
        { success: false, error: "job with id required" },
        { status: 400 },
      );
    }
    const existing = await getJob(body.job.id);
    if (existing?.ownerId && existing.ownerId !== acc.id) {
      return NextResponse.json(
        { success: false, error: "Not your hire" },
        { status: 403 },
      );
    }
    const saved = await saveJob({ ...body.job, ownerId: acc.id });
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
