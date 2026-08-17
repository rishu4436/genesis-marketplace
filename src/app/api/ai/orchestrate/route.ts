import { NextResponse } from "next/server";
import { orchestrateHire } from "@/lib/ai/intelligence";
import type { BuyerContext } from "@/lib/buyer-context";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/ai/orchestrate — marketplace brain: match + plan + brief rewrite */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      query?: string;
      buyerContext?: BuyerContext | null;
    };
    const query = (body.query || "").trim();
    if (query.length < 4) {
      return NextResponse.json(
        { success: false, error: "query too short" },
        { status: 400 },
      );
    }
    const data = await orchestrateHire({
      query,
      buyerContext: body.buyerContext ?? null,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "orchestrate failed",
      },
      { status: 500 },
    );
  }
}
