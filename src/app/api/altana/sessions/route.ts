import { NextResponse } from "next/server";
import { grantAgentSession } from "@/lib/altana/client";
import { listSessions } from "@/lib/altana/session-store";

export const runtime = "nodejs";
export const maxDuration = 120;

/** GET — list sessions (no private keys) */
export async function GET() {
  const data = await listSessions(50);
  return NextResponse.json({ success: true, data });
}

/**
 * POST — grant a session for a Genesis specialist
 * body: { agentSlug, expiryHours?, forceDemo? }
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      agentSlug?: string;
      expiryHours?: number;
      forceDemo?: boolean;
    };
    if (!body.agentSlug) {
      return NextResponse.json(
        { success: false, error: "agentSlug required" },
        { status: 400 },
      );
    }
    const session = await grantAgentSession({
      agentSlug: body.agentSlug,
      expiryHours: body.expiryHours,
      forceDemo: body.forceDemo,
    });
    return NextResponse.json({
      success: true,
      data: session,
      message:
        session.mode === "live"
          ? session.transactionHash
            ? `Live Keystore grant ${session.transactionHash}`
            : "Live session granted on Altana Keystore"
          : "Demo session recorded (no chain write)",
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "grant failed",
      },
      { status: 500 },
    );
  }
}
