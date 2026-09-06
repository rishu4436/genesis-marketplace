import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST /api/sell/probe
 * Fetch an A2A agent card. Does not list the seller — only reports reachability.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { url?: string };
    const raw = (body.url || "").trim();
    if (!/^https:\/\//i.test(raw)) {
      return NextResponse.json(
        { success: false, error: "https URL required" },
        { status: 400 },
      );
    }
    const candidates = [
      raw,
      raw.replace(/\/$/, "") + "/.well-known/agent-card.json",
    ];
    let lastError = "unreachable";
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as {
          name?: string;
          description?: string;
          url?: string;
        } | null;
        if (!res.ok || !json) {
          lastError = `${res.status} ${res.statusText}`;
          continue;
        }
        const name = json.name || json.url;
        if (!name) {
          lastError = "JSON but no agent name";
          continue;
        }
        return NextResponse.json({
          success: true,
          data: {
            probed: url,
            name,
            description: (json.description || "").slice(0, 280),
            hireable: true,
            note: "Card reachable. Claim it on /sell to list.",
          },
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : "fetch failed";
      }
    }
    return NextResponse.json({
      success: false,
      error: lastError,
      hireable: false,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "probe failed" },
      { status: 400 },
    );
  }
}
