import { NextResponse } from "next/server";
import { getJob, saveJob } from "@/lib/job-store";
import {
  encodeClaimRefund,
  encodeDispute,
  encodeSettleApprove,
  isTxHash,
} from "@/lib/erc8183-escrow";
import { readOnchainJob } from "@/lib/erc8183-read";

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
