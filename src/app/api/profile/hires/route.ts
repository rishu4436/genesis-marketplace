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
  const body = (await req.json()) as { jobId?: string; jobIds?: string[] };
  const ids = [
    ...new Set(
      [...(body.jobIds || []), body.jobId].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  ];
  if (ids.length === 0) {
    return NextResponse.json(
      { success: false, error: "jobId required" },
      { status: 400 },
    );
  }
  const { saveJob } = await import("@/lib/job-store");
  const attached = [];
  for (const id of ids) {
    const job = await getJob(id);
    if (!job) continue;
    if (job.ownerId && job.ownerId !== acc.id) continue;
    job.ownerId = acc.id;
    await attachJob(acc.id, job.id);
    await saveJob(job);
    attached.push(job);
  }
  if (attached.length === 0) {
    return NextResponse.json(
      { success: false, error: "Hire not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    success: true,
    data: attached.length === 1 ? attached[0] : attached,
    count: attached.length,
  });
}
