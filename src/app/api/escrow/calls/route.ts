import { NextResponse } from "next/server";
import {
  budgetWeiFor,
  encodeClaimRefund,
  encodeDispute,
  encodeFund,
  encodeRegisterJob,
  encodeSetBudget,
  encodeSettleApprove,
} from "@/lib/erc8183-escrow";

export const runtime = "nodejs";

/**
 * POST /api/escrow/calls
 * Encode register / setBudget / fund / settle / dispute for a known on-chain job id.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      onchainJobId?: string;
      action?: "register" | "setBudget" | "fund" | "approve" | "dispute" | "refund";
      genesisSlug?: string;
      budgetU?: string;
      amountWei?: string;
    };
    const id = BigInt(body.onchainJobId || "0");
    if (id <= BigInt(0)) {
      return NextResponse.json(
        { success: false, error: "onchainJobId required" },
        { status: 400 },
      );
    }
    const amount = body.amountWei
      ? BigInt(body.amountWei)
      : budgetWeiFor({
          genesisSlug: body.genesisSlug,
          budgetU: body.budgetU,
        });
    const action = body.action || "fund";
    const call =
      action === "register"
        ? encodeRegisterJob(id)
        : action === "setBudget"
          ? encodeSetBudget(id, amount)
          : action === "fund"
            ? encodeFund(id, amount)
            : action === "approve"
              ? encodeSettleApprove(id)
              : action === "dispute"
                ? encodeDispute(id)
                : encodeClaimRefund(id);

    return NextResponse.json({ success: true, data: { action, call, onchainJobId: id.toString() } });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Encode failed",
      },
      { status: 500 },
    );
  }
}
