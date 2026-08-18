import { NextResponse } from "next/server";
import { getJob } from "@/lib/job-store";
import { jobWithEvidence, verifyJobReceipt } from "@/lib/job-receipt";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/jobs/:id/receipt
 * Public evidence for a hire: spec, hashes, mandate, verify result.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const job = await getJob(decodeURIComponent(id));
  if (!job) {
    return NextResponse.json(
      { success: false, error: "Job not found" },
      { status: 404 },
    );
  }

  const evidence = jobWithEvidence(job);
  const verify = verifyJobReceipt(evidence.job);

  return NextResponse.json({
    success: true,
    jobId: evidence.job.id,
    claimCode: evidence.job.claimCode ?? null,
    spec: evidence.spec,
    receipt: evidence.receipt,
    verify,
    session: evidence.job.session
      ? {
          id: evidence.job.session.id,
          status: evidence.job.session.status,
          spend: evidence.job.session.policy.spend,
          mayMoveFunds: evidence.job.session.policy.mayMoveFunds,
        }
      : null,
    sharePath: `/jobs/${encodeURIComponent(evidence.job.id)}`,
  });
}
