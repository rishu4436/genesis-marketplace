import { NextResponse } from "next/server";
import { createJobWithLiveNegotiate } from "@/lib/hire-engine";
import type { CategoryId } from "@/lib/categories";
import type { HireIntent } from "@/lib/hire";
import { getGenesisAgent } from "@/lib/genesis-agents";
import { saveJob } from "@/lib/job-store";
import type { CommerceTier } from "@/lib/agent-model";
import type { BuyerContext } from "@/lib/buyer-context";

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

    const job = await createJobWithLiveNegotiate({
      chainId: Number(body.chainId || g?.chainId || 56),
      tokenId: String(
        body.tokenId || g?.tokenId || `genesis:${body.genesisSlug}`,
      ),
      agentName: body.agentName || g?.name || "Agent",
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

    try {
      await saveJob(job);
    } catch {
      /* still return job */
    }

    return NextResponse.json({
      success: true,
      data: job,
      sharePath: `/jobs/${encodeURIComponent(job.id)}`,
      claimCode: job.claimCode,
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
