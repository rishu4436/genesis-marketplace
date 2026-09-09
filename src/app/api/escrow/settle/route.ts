import { NextResponse } from "next/server";
import { getJob, saveJob } from "@/lib/job-store";
import {
  encodeClaimRefund,
  encodeDispute,
  encodeSettleApprove,
  isTxHash,
} from "@/lib/erc8183-escrow";
import { readDisputeWindow, readOnchainJob } from "@/lib/erc8183-read";
import { pinEscrowJudgeProof } from "@/lib/judge-proof";

export const runtime = "nodejs";

/**
 * POST /api/escrow/settle
 * { jobId, action: "approve" | "dispute" | "refund", txHash? }
 * Without txHash: return calldata for the buyer wallet.
 * With txHash: record it after a chain read — never invent hashes.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      jobId?: string;
      action?: "approve" | "dispute" | "refund";
      txHash?: string;
    };
    if (!body.jobId) {
      return NextResponse.json(
        { success: false, error: "jobId required" },
        { status: 400 },
      );
    }
    const action = body.action || "approve";
    const job = await getJob(body.jobId);
    if (!job?.escrow?.onchainJobId) {
      return NextResponse.json(
        { success: false, error: "Not an escrowed job" },
        { status: 404 },
      );
    }

    const onchainId = BigInt(job.escrow.onchainJobId);
    const chainNow = await readOnchainJob(onchainId);
    const disputeWindow =
      job.escrow.disputeWindowSeconds || (await readDisputeWindow());
    const now = Math.floor(Date.now() / 1000);
    const windowEnd =
      chainNow.submittedAt > 0 ? chainNow.submittedAt + disputeWindow : 0;
    const inWindow =
      chainNow.statusName === "SUBMITTED" &&
      chainNow.submittedAt > 0 &&
      now < windowEnd;
    const windowElapsed =
      chainNow.statusName === "SUBMITTED" &&
      chainNow.submittedAt > 0 &&
      now >= windowEnd;

    if (action === "approve") {
      if (chainNow.statusName === "COMPLETED") {
        /* already settled — still allow recording a real hash below */
      } else if (!windowElapsed) {
        return NextResponse.json(
          {
            success: false,
            error: inWindow
              ? `Dispute window still open until ${new Date(windowEnd * 1000).toISOString()} — approve would revert`
              : "Approve is only valid after on-chain submit and the 7-day window",
          },
          { status: 400 },
        );
      }
    }
    if (action === "dispute" && !inWindow && chainNow.statusName !== "REJECTED") {
      return NextResponse.json(
        {
          success: false,
          error: "Dispute is only valid inside the window after submit",
        },
        { status: 400 },
      );
    }
    if (action === "refund") {
      const canRefund =
        chainNow.statusName === "OPEN" ||
        (chainNow.statusName === "FUNDED" &&
          chainNow.expiredAt > 0 &&
          now >= chainNow.expiredAt &&
          chainNow.submittedAt === 0);
      if (!canRefund) {
        return NextResponse.json(
          {
            success: false,
            error: "Refund is only valid if the seller never submitted and the job expired",
          },
          { status: 400 },
        );
      }
    }

    const call =
      action === "approve"
        ? encodeSettleApprove(onchainId)
        : action === "dispute"
          ? encodeDispute(onchainId)
          : encodeClaimRefund(onchainId);

    if (!body.txHash) {
      return NextResponse.json({
        success: true,
        data: {
          action,
          call,
          onchainJobId: job.escrow.onchainJobId,
          note:
            action === "approve"
              ? "Approve (settle) is valid only after the dispute window."
              : action === "dispute"
                ? "Dispute is valid only inside the window after submit."
                : "Claim refund if the seller never delivered and the job expired.",
        },
      });
    }

    if (!isTxHash(body.txHash)) {
      return NextResponse.json(
        { success: false, error: "txHash must be a 32-byte hex hash" },
        { status: 400 },
      );
    }

    const chain = await readOnchainJob(onchainId);
    if (action === "approve" && chain.statusName !== "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          error: `Chain is ${chain.statusName}, not COMPLETED — settle hash not recorded`,
        },
        { status: 400 },
      );
    }
    const hash = body.txHash;
    const escrow = { ...job.escrow, chainStatus: chain.statusName };
    if (action === "approve") escrow.settleTx = hash;
    if (action === "dispute") escrow.disputeTx = hash;

    const at = new Date().toISOString();
    const next = {
      ...job,
      escrow,
      updatedAt: at,
      timeline: [
        ...job.timeline,
        {
          at,
          status: job.status,
          detail: `${action} tx submitted · ${hash.slice(0, 10)}… · chain ${chain.statusName}`,
        },
      ],
    };
    const saved = await saveJob(next);
    try {
      await pinEscrowJudgeProof(saved);
    } catch {
      /* pin is best-effort */
    }

    return NextResponse.json({
      success: true,
      data: {
        job: saved,
        chain,
        txHash: hash,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Settle failed",
      },
      { status: 500 },
    );
  }
}
