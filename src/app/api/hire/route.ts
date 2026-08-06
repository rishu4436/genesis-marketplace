import { NextResponse } from "next/server";
import {
  createNegotiatedJob,
  fulfillJob,
  type HireJob,
} from "@/lib/hire-engine";
import type { CategoryId } from "@/lib/categories";
import type { HireIntent } from "@/lib/hire";

export const runtime = "nodejs";

/**
 * POST /api/hire
 * Negotiate + optionally auto-fulfill a marketplace job (ERC-8183 simulation).
 * Body: hire intent fields + { autoFulfill?: boolean, genesisSlug?: string }
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
    if (!body.chainId || body.tokenId == null || body.tokenId === "") {
      return NextResponse.json(
        { success: false, error: "chainId and tokenId are required" },
        { status: 400 },
      );
    }

    let job: HireJob = createNegotiatedJob({
      chainId: Number(body.chainId),
      tokenId: String(body.tokenId),
      agentName: body.agentName || "Agent",
      genesisSlug: body.genesisSlug,
      categoryId: body.categoryId,
      task: body.task.trim(),
      budgetUsd: body.budgetUsd || "10",
      duration: body.duration || "once",
      risk: body.risk || "low",
      notes: body.notes,
    });

    if (body.autoFulfill !== false) {
      // Small delay feel is client-side; server returns completed job for demo reliability
      job = fulfillJob(job);
    }

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
