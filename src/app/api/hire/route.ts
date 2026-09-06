import { NextResponse } from "next/server";
import { createJobWithLiveNegotiate } from "@/lib/hire-engine";
import type { CategoryId } from "@/lib/categories";
import type { HireIntent } from "@/lib/hire";
import { getGenesisAgent } from "@/lib/genesis-agents";
import { getFeaturedByToken } from "@/lib/third-party-sellers";
import { BSC_MAINNET_CHAIN_ID } from "@/lib/pins";
import { saveJob } from "@/lib/job-store";
import { attachJob } from "@/lib/accounts";
import { currentAccount } from "@/lib/session";
import type { CommerceTier } from "@/lib/agent-model";
import type { BuyerContext } from "@/lib/buyer-context";
import type { DemoPayment } from "@/lib/demo-pay";
import { verifyWalletPayment } from "@/lib/verify-wallet-pay";
import { sealJob } from "@/lib/job-receipt";
import { ESCROW_STANCE } from "@/lib/escrow-stance";
import { incidentFromPolicyBreak } from "@/lib/job-decision";
import { saveIncident } from "@/lib/slash-store";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/hire
 * Tiers (stockanalyst-inspired): free | full | escrow
 * Full = multi-source analysis + specialist plan + optional buyer context.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      chainId: number;
      tokenId: string;
      agentName: string;
      genesisSlug?: string;
      categoryId?: CategoryId | null;
      task: string;
      budgetUsd: string;
      duration: HireIntent["duration"];
      risk: HireIntent["risk"];
      notes?: string;
      autoFulfill?: boolean;
      tier?: CommerceTier;
      buyerContext?: BuyerContext | null;
      payment?: DemoPayment | null;
    };

    if (!body.task?.trim()) {
      return NextResponse.json(
        { success: false, error: "task is required" },
        { status: 400 },
      );
    }

    const tier: CommerceTier =
      body.tier === "free" || body.tier === "escrow" ? body.tier : "full";

    const g = body.genesisSlug
      ? getGenesisAgent(body.genesisSlug)
      : undefined;
    const pinned = getFeaturedByToken(
      Number(body.chainId) || BSC_MAINNET_CHAIN_ID,
      body.tokenId,
    );
    const rawName = (body.agentName || "").trim();
    const stubName = !rawName || /^agent(?:\s*#?\d*)?$/i.test(rawName);
    const agentName =
      g?.name ||
      (!stubName ? rawName : "") ||
      pinned?.name ||
      (body.tokenId ? `Agent #${body.tokenId}` : "Indexed seller");

    let job = await createJobWithLiveNegotiate({
      chainId: BSC_MAINNET_CHAIN_ID,
      tokenId: String(
        (g?.tokenId && g.chainId === 56 ? g.tokenId : null) ||
          (body.genesisSlug ? `genesis:${body.genesisSlug}` : body.tokenId),
      ),
      agentName,
      genesisSlug: body.genesisSlug,
      categoryId: body.categoryId ?? g?.categoryId,
      task: body.task.trim(),
      budgetUsd: body.budgetUsd || "10",
      duration: body.duration || "once",
      risk: body.risk || "low",
      notes: body.notes,
      autoFulfill: body.autoFulfill !== false,
      tier,
      buyerContext: body.buyerContext ?? null,
    });

    if (body.payment?.status === "succeeded") {
      if (body.payment.method === "wallet") {
        const check = await verifyWalletPayment(body.payment);
        if (!check.ok) {
          return NextResponse.json(
            { success: false, error: check.error || "Wallet payment failed" },
            { status: 402 },
          );
        }
        job.payment = { ...body.payment, demo: false };
      } else {
        job.payment = { ...body.payment, demo: true };
      }
    }

    try {
      const acc = await currentAccount();
      if (acc) {
        job.ownerId = acc.id;
        await attachJob(acc.id, job.id);
      }
      job = await saveJob(job);
      const broke = incidentFromPolicyBreak(job);
      if (broke) await saveIncident(broke);
    } catch {
      job = sealJob(job, { resign: true });
    }

    return NextResponse.json({
      success: true,
      data: job,
      sharePath: `/jobs/${encodeURIComponent(job.id)}`,
      receiptPath: `/api/jobs/${encodeURIComponent(job.id)}/receipt`,
      claimCode: job.claimCode,
      sessionId: job.session?.id ?? null,
      escrow: ESCROW_STANCE,
      model: "genesis-v2-stockanalyst-inspired",
      tier,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Buy failed",
      },
      { status: 500 },
    );
  }
}
