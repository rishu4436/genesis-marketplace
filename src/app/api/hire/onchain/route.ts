import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/session";
import {
  onchainBuyAndNotify,
  onchainFetch,
  onchainSettle,
  onchainStatus,
  fundingAddresses,
} from "@/lib/onchain-hire";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/hire/onchain
 * body: { action: "buy"|"status"|"fetch"|"settle"|"funding", ... }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action?: string;
      genesisSlug?: string;
      task?: string;
      budgetU?: number;
      deadlineMin?: number;
      jobId?: number;
      settleAction?: "approve" | "dispute" | "reject";
    };

    const action = body.action || "buy";

    if (action === "funding") {
      return NextResponse.json({
        success: true,
        data: fundingAddresses(),
      });
    }

    if (action === "status") {
      if (!body.jobId) {
        return NextResponse.json(
          { success: false, error: "jobId required" },
          { status: 400 },
        );
      }
      const r = await onchainStatus(body.jobId);
      return NextResponse.json({ success: r.ok, data: r, error: r.error });
    }

    if (action === "fetch") {
      if (!body.jobId) {
        return NextResponse.json(
          { success: false, error: "jobId required" },
          { status: 400 },
        );
      }
      const r = await onchainFetch(body.jobId);
      return NextResponse.json({ success: r.ok, data: r, error: r.error });
    }

    if (action === "buy" || action === "settle") {
      const acc = await currentAccount();
      if (!acc) {
        return NextResponse.json(
          { success: false, error: "Sign in required" },
          { status: 401 },
        );
      }
    }

    if (action === "settle") {
      if (!body.jobId) {
        return NextResponse.json(
          { success: false, error: "jobId required" },
          { status: 400 },
        );
      }
      const r = await onchainSettle(
        body.jobId,
        body.settleAction || "approve",
      );
      return NextResponse.json({ success: r.ok, data: r, error: r.error });
    }

    // buy
    if (!body.genesisSlug || !body.task?.trim()) {
      return NextResponse.json(
        { success: false, error: "genesisSlug and task required" },
        { status: 400 },
      );
    }

    const result = await onchainBuyAndNotify({
      genesisSlug: body.genesisSlug,
      task: body.task.trim(),
      budgetU: body.budgetU ?? 0.5,
      deadlineMin: body.deadlineMin ?? 60,
    });

    if (!result.buy.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.buy.error,
          data: result,
          hint: "Fund buyer wallet with BSC mainnet BNB + $U. See /fund",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "on-chain hire failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: fundingAddresses(),
    note: "POST { action: 'buy'|'status'|'fetch'|'settle', ... }",
  });
}
