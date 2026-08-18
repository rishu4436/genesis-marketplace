import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/session";
import { attachJob } from "@/lib/accounts";
import { getJob } from "@/lib/job-store";

export const runtime = "nodejs";

export async function GET() {
  const acc = await currentAccount();
  if (!acc) {
    return NextResponse.json(
      { success: false, error: "Sign in to see hires" },
      { status: 401 },
    );
  }
  const jobs = [];
  for (const id of acc.jobIds) {
    const job = await getJob(id);
    if (job) jobs.push(job);
  }
  return NextResponse.json({ success: true, data: jobs, signedIn: true });
}

/** Attach an existing receipt (claim / job id) to this account. */
export async function POST(req: Request) {
  const acc = await currentAccount();
  if (!acc) {
    return NextResponse.json(
      { success: false, error: "Sign in to save this hire" },
      { status: 401 },
    );
  }
  const body = (await req.json()) as { jobId?: string };
  if (!body.jobId) {
    return NextResponse.json(
      { success: false, error: "jobId required" },
      { status: 400 },
    );
  }
  const job = await getJob(body.jobId);
  if (!job) {
    return NextResponse.json(
      { success: false, error: "Hire not found" },
      { status: 404 },
    );
  }
  job.ownerId = acc.id;
  await attachJob(acc.id, job.id);
  const { saveJob } = await import("@/lib/job-store");
  await saveJob(job);
  return NextResponse.json({ success: true, data: job });
}
