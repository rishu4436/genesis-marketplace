import { NextResponse } from "next/server";
import { getJob, saveJob } from "@/lib/job-store";
import {
  bytes32FromSha256,
  canSubmitOnchain,
  encodeSubmit,
  isTxHash,
} from "@/lib/erc8183-escrow";
import { hashDeliverable } from "@/lib/job-receipt";
import { readDisputeWindow, readOnchainJob } from "@/lib/erc8183-read";
import { pinEscrowJudgeProof } from "@/lib/judge-proof";
import { siteUrl } from "@/lib/site-url";
import { hasLivePayload } from "@/lib/job-outcome";
import { currentAccount } from "@/lib/session";
import { readIdentityOwner, sameWallet } from "@/lib/erc8004-owner";

export const runtime = "nodejs";

/**
 * POST /api/escrow/submit
 * Provider-only: Funded → Submitted with the sealed plan hash.
 * Without txHash: return calldata. With txHash: record after a chain read.
 * Never invents hashes. Never marks Ready/Settled.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      jobId?: string;
      txHash?: string;
    };
    if (!body.jobId) {
      return NextResponse.json(
        { success: false, error: "jobId required" },
        { status: 400 },
      );
    }
    const acc = await currentAccount();
    if (!acc?.wallet) {
      return NextResponse.json(
        {
          success: false,
          error: "Sign in with the listing wallet to submit.",
        },
        { status: 401 },
      );
    }
    const job = await getJob(body.jobId);
    if (!job?.escrow?.onchainJobId) {
      return NextResponse.json(
        { success: false, error: "Not an escrowed job" },
        { status: 404 },
      );
    }
    const providerOk = sameWallet(acc.wallet, job.escrow.provider);
    let ownerOk = false;
    if (!providerOk && job.tokenId && /^\d+$/.test(String(job.tokenId))) {
      try {
        const owner = await readIdentityOwner(
          String(job.tokenId),
          job.chainId === 97 ? 97 : 56,
        );
        ownerOk = sameWallet(acc.wallet, owner);
      } catch {
        ownerOk = false;
      }
    }
    if (!providerOk && !ownerOk) {
      return NextResponse.json(
        {
          success: false,
          error: "This wallet is not the escrow provider or the token owner.",
        },
        { status: 403 },
      );
    }

    if (!hasLivePayload(job)) {
      return NextResponse.json(
        {
          success: false,
          error: "No plan on this receipt to hash. Get plan first.",
        },
        { status: 400 },
      );
    }

    const onchainId = BigInt(job.escrow.onchainJobId);
    const escrowChainId = job.escrow.chainId === 97 ? 97 : 56;
    const chain = await readOnchainJob(onchainId, escrowChainId);
    const now = Math.floor(Date.now() / 1000);

    if (chain.statusName === "SUBMITTED" || chain.statusName === "COMPLETED") {
      if (!body.txHash) {
        return NextResponse.json({
          success: true,
          data: {
            alreadySubmitted: true,
            chain,
            onchainJobId: job.escrow.onchainJobId,
            note: "Already submitted on-chain. Dispute window runs from submittedAt.",
          },
        });
      }
    } else if (chain.statusName !== "FUNDED") {
      return NextResponse.json(
        {
          success: false,
          error: `On-chain job is ${chain.statusName}, not FUNDED`,
        },
        { status: 400 },
      );
    }

    const disputeWindow =
      job.escrow.disputeWindowSeconds || (await readDisputeWindow(escrowChainId));
    if (
      chain.statusName === "FUNDED" &&
      !canSubmitOnchain({
        statusName: chain.statusName,
        expiredAt: chain.expiredAt,
        disputeWindowSeconds: disputeWindow,
        nowSec: now,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "SubmissionTooLate on this lock — OptimisticPolicy needs expiredAt ≥ now + dispute window. Fund a new job, then submit from the operator wallet.",
        },
        { status: 400 },
      );
    }

    if (!body.txHash) {
      const outputHash = hashDeliverable(job.deliverable);
      const deliverable = bytes32FromSha256(outputHash);
      if (!deliverable) {
        return NextResponse.json(
          { success: false, error: "Receipt has no output hash to submit" },
          { status: 400 },
        );
      }
      const receiptUrl = `${siteUrl()}/jobs/${encodeURIComponent(job.id)}`;
      const call = encodeSubmit({
        jobId: onchainId,
        deliverable,
        receiptUrl,
        chainId: escrowChainId,
      });
      return NextResponse.json({
        success: true,
        data: {
          action: "submit",
          call,
          onchainJobId: job.escrow.onchainJobId,
          provider: job.escrow.provider,
          deliverable,
          receiptUrl,
          note: "Connect the RangeKeeper operator wallet (escrow provider). The buyer who funded cannot submit.",
        },
      });
    }

    if (!isTxHash(body.txHash)) {
      return NextResponse.json(
        { success: false, error: "txHash must be a 32-byte hex hash" },
        { status: 400 },
      );
    }

    const after = await readOnchainJob(onchainId, escrowChainId);
    if (after.statusName !== "SUBMITTED" && after.statusName !== "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          error: `Chain still ${after.statusName} after submit tx — not recorded`,
        },
        { status: 400 },
      );
    }

    const hash = body.txHash;
    const at = new Date().toISOString();
    const escrow = {
      ...job.escrow,
      submitTx: hash,
      chainStatus: after.statusName,
      submittedAt: after.submittedAt || job.escrow.submittedAt,
    };
    const saved = await saveJob({
      ...job,
      escrow,
      updatedAt: at,
      timeline: [
        ...job.timeline,
        {
          at,
          status: job.status,
          detail: `ERC-8183 submit · ${hash.slice(0, 10)}… · chain ${after.statusName} · not paid out`,
        },
      ],
    });
    try {
      await pinEscrowJudgeProof(saved);
    } catch {
      /* pin is best-effort */
    }

    return NextResponse.json({
      success: true,
      data: {
        job: saved,
        chain: after,
        txHash: hash,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Submit failed",
      },
      { status: 500 },
    );
  }
}
