import { NextResponse } from "next/server";
import { createJobWithLiveNegotiate } from "@/lib/hire-engine";
import type { CategoryId } from "@/lib/categories";
import type { HireIntent } from "@/lib/hire";
import { getGenesisAgent } from "@/lib/genesis-agents";

export const runtime = "nodejs";

/**
 * POST /api/hire
 * Negotiate via live APEX serviceUrl when available, else sim; auto-fulfill by default.
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
    };

    if (!body.task?.trim()) {
      return NextResponse.json(
        { success: false, error: "task is required" },
        { status: 400 },
      );
    }

    const g = body.genesisSlug
      ? getGenesisAgent(body.genesisSlug)
      : undefined;

    const job = await createJobWithLiveNegotiate({
      chainId: Number(body.chainId || g?.chainId || 56),
      tokenId: String(body.tokenId || g?.tokenId || `genesis:${body.genesisSlug}`),
      agentName: body.agentName || g?.name || "Agent",
      genesisSlug: body.genesisSlug,
      categoryId: body.categoryId ?? g?.categoryId,
      task: body.task.trim(),
      budgetUsd: body.budgetUsd || "10",
      duration: body.duration || "once",
      risk: body.risk || "low",
      notes: body.notes,
      autoFulfill: body.autoFulfill !== false,
    });

    return NextResponse.json({ success: true, data: job });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Hire failed",
      },
      { status: 500 },
    );
  }
}
