import { NextResponse } from "next/server";
import { getJob, saveJob } from "@/lib/job-store";
import { deliverableSchemaValid } from "@/lib/job-receipt";
import {
  canSubmitOnchain,
  escrowUiPhase,
  isEscrowChainId,
} from "@/lib/erc8183-escrow";
import {
  hasOnchainDeliverable,
  readDisputeWindow,
  readOnchainJob,
} from "@/lib/erc8183-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/escrow/status?jobId=<marketplace>&onchainJobId=<n>
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId") || "";
    const onchainParam = url.searchParams.get("onchainJobId") || "";
    const chainParam = Number(url.searchParams.get("chainId") || "");

    const stored = jobId ? await getJob(jobId) : null;
    const onchainJobId = BigInt(
      onchainParam || stored?.escrow?.onchainJobId || "0",
    );
    if (onchainJobId <= BigInt(0)) {
      return NextResponse.json(
        { success: false, error: "onchainJobId required" },
        { status: 400 },
      );
    }

    const escrowChainId =
      stored?.escrow?.chainId === 97
        ? 97
        : isEscrowChainId(chainParam)
          ? chainParam
          : 56;
    const chain = await readOnchainJob(onchainJobId, escrowChainId);
    const disputeWindow =
      stored?.escrow?.disputeWindowSeconds ||
      (await readDisputeWindow(escrowChainId));
    const hasPayload =
      deliverableSchemaValid(stored?.deliverable) ||
      hasOnchainDeliverable(chain.deliverable);

    const phase = escrowUiPhase({
      chainStatus: chain.statusName,
      hasPayload,
      submittedAt: chain.submittedAt,
      disputeWindowSeconds: disputeWindow,
    });

    if (stored?.escrow) {
      const next = {
        ...stored,
        escrow: {
          ...stored.escrow,
          chainStatus: chain.statusName,
          submittedAt: chain.submittedAt || stored.escrow.submittedAt,
          disputeWindowSeconds: disputeWindow,
          expiredAt: chain.expiredAt,
        },
      };
      if (
        next.escrow.chainStatus !== stored.escrow.chainStatus ||
        next.escrow.submittedAt !== stored.escrow.submittedAt
      ) {
        try {
          await saveJob(next);
        } catch {
          /* ignore */
        }
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const windowEnd =
      chain.submittedAt > 0 ? chain.submittedAt + disputeWindow : 0;
    const inWindow =
      chain.statusName === "SUBMITTED" &&
      chain.submittedAt > 0 &&
      now < windowEnd;
    const expiredUnsubmitted =
      chain.statusName === "FUNDED" &&
      chain.expiredAt > 0 &&
      now >= chain.expiredAt &&
      chain.submittedAt === 0;
    const submitWindowOk = canSubmitOnchain({
      statusName: chain.statusName,
      expiredAt: chain.expiredAt,
      disputeWindowSeconds: disputeWindow,
      nowSec: now,
    });

    return NextResponse.json({
      success: true,
      data: {
        chain,
        phase,
        hasPayload,
        disputeWindowSeconds: disputeWindow,
        windowEnd,
        inWindow,
        provider: stored?.escrow?.provider || chain.provider,
        canSubmit: submitWindowOk && hasPayload,
        submitBlockedReason:
          chain.statusName === "FUNDED" && hasPayload && !submitWindowOk
            ? `SubmissionTooLate — this lock’s deadline no longer covers the ${
                disputeWindow >= 86400
                  ? `${Math.round(disputeWindow / 86400)}-day`
                  : `${Math.round(disputeWindow / 60)}-minute`
              } dispute window. Fund a new job (longer deadline), then submit immediately.`
            : null,
        canDispute: inWindow,
        canApprove:
          chain.statusName === "SUBMITTED" &&
          chain.submittedAt > 0 &&
          now >= windowEnd,
        canRefund:
          chain.statusName === "OPEN" || expiredUnsubmitted,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Escrow status failed",
      },
      { status: 500 },
    );
  }
}
