import { NextResponse } from "next/server";
import { revokeAgentSession } from "@/lib/altana/client";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const session = await revokeAgentSession(decodeURIComponent(id));
    return NextResponse.json({
      success: true,
      data: session,
      message: "Session revoked (marketplace + best-effort on-chain)",
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "revoke failed",
      },
      { status: 500 },
    );
  }
}
