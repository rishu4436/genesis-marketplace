import { NextResponse } from "next/server";
import { getJob, saveJob } from "@/lib/job-store";
import { closeSession, sessionPublicView } from "@/lib/job-session";
import { ESCROW_STANCE } from "@/lib/escrow-stance";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/jobs/:id/session — public session + isolation (no secrets) */
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
    session: job.session ? sessionPublicView(job.session) : null,
    isolation: job.isolation ?? null,
    escrow: ESCROW_STANCE,
  });
}

/** POST /api/jobs/:id/session — { action: "revoke" } */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const job = await getJob(decodeURIComponent(id));
  if (!job) {
    return NextResponse.json(
      { success: false, error: "Job not found" },
      { status: 404 },
    );
  }
  if (!job.session) {
    return NextResponse.json(
      { success: false, error: "No session on this hire" },
      { status: 400 },
    );
  }

  let action = "revoke";
  try {
    const body = (await req.json()) as { action?: string };
    action = body.action || "revoke";
  } catch {
    /* default revoke */
  }

  if (action !== "revoke") {
    return NextResponse.json(
      { success: false, error: "Only revoke is supported" },
      { status: 400 },
    );
  }

  const next = {
    ...job,
    session: closeSession(job.session, "revoked", "buyer revoked"),
  };
  await saveJob(next);
  return NextResponse.json({
    success: true,
    session: sessionPublicView(next.session!),
  });
}
