import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/session";
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
  return NextResponse.json({ success: true, data: jobs });
}
