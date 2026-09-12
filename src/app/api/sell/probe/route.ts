import { NextResponse } from "next/server";
import { probeA2aUrl } from "@/lib/probe-a2a";
import { rateGate } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST /api/sell/probe
 * Reachability only. Does not list the seller or mark hireable.
 */
export async function POST(req: Request) {
  const limited = await rateGate(req, "sell-probe", 12, 10 * 60);
  if (limited) return limited;
  try {
    const body = (await req.json()) as { url?: string };
    const probe = await probeA2aUrl(body.url || "");
    if (!probe.ok) {
      return NextResponse.json(
        {
          success: false,
          error: probe.error || "unreachable",
          hireable: false,
        },
        { status: 400 },
      );
    }
    return NextResponse.json({
      success: true,
      data: {
        probed: probe.probed,
        name: probe.name || null,
        description: probe.description || null,
        kind: probe.kind,
        hireable: false,
        note: "Reachable. Hireable only after you own the token and the job ticket passes.",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "probe failed", hireable: false },
      { status: 400 },
    );
  }
}
