import { NextResponse } from "next/server";
import { getJob, saveJob } from "@/lib/job-store";
import { sealJob } from "@/lib/job-receipt";
import {
  applyDecision,
  incidentFromDispute,
  type DecisionAction,
} from "@/lib/job-decision";
import { saveIncident } from "@/lib/slash-store";
import { ESCROW_STANCE } from "@/lib/escrow-stance";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/jobs/:id/decision */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const job = await getJob(decodeURIComponent(id));
  if (!job) {
    return NextResponse.json(
      { success: false, error: "Job not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    success: true,
    jobId: job.id,
    decision: job.decision ?? null,
    acceptance: job.receipt?.acceptance ?? null,
    escrow: ESCROW_STANCE,
  });
}

/** POST /api/jobs/:id/decision { action: accept|dispute, reason? } */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const job = await getJob(decodeURIComponent(id));
  if (!job) {
    return NextResponse.json(
      { success: false, error: "Job not found" },
      { status: 404 },
    );
  }

  let action: DecisionAction = "accept";
  let reason: string | undefined;
  try {
    const body = (await req.json()) as {
      action?: DecisionAction;
      reason?: string;
    };
    if (body.action === "dispute" || body.action === "accept") {
      action = body.action;
    }
    reason = body.reason;
  } catch {
    /* default accept */
  }

  const next = applyDecision(job, action, reason);
  if (!next.ok) {
    return NextResponse.json(
      { success: false, error: next.error },
      { status: 400 },
    );
  }

  const saved = await saveJob(sealJob(next.job, { resign: true }));
  if (saved.decision?.state === "disputed") {
    const inc = incidentFromDispute(saved);
    if (inc) await saveIncident(inc);
  }

  return NextResponse.json({
    success: true,
    jobId: saved.id,
    decision: saved.decision,
    acceptance: saved.receipt?.acceptance ?? null,
    escrow: ESCROW_STANCE,
    note: "Plan quality only — no payout and no custody change",
  });
}
