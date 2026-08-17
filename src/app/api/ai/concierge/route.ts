import { NextResponse } from "next/server";
import { conciergeChat } from "@/lib/ai/intelligence";
import type { BuyerContext } from "@/lib/buyer-context";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/ai/concierge — conversational hire advisor */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      history?: { role: "user" | "assistant"; content: string }[];
      buyerContext?: BuyerContext | null;
    };
    const message = (body.message || "").trim();
    if (message.length < 2) {
      return NextResponse.json(
        { success: false, error: "message required" },
        { status: 400 },
      );
    }
    const data = await conciergeChat({
      message,
      history: body.history,
      buyerContext: body.buyerContext ?? null,
    });
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "concierge failed",
      },
      { status: 500 },
    );
  }
}
