import { NextResponse } from "next/server";
import { altanaStatus } from "@/lib/altana/client";
import { allPolicies } from "@/lib/altana/policies";
import { listSessions } from "@/lib/altana/session-store";
import { readLiveProof } from "@/lib/altana/proof";

export const runtime = "nodejs";

export async function GET() {
  const [sessions, proof] = await Promise.all([
    listSessions(10),
    readLiveProof(),
  ]);
  const status = altanaStatus();
  return NextResponse.json({
    success: true,
    data: {
      ...status,
      mode: proof?.transactionHash ? "live" : status.mode,
      proof,
      policies: allPolicies().map((p) => ({
        agentSlug: p.agentSlug,
        title: p.title,
        description: p.description,
        bullets: p.bullets,
        defaultExpiryHours: p.defaultExpiryHours,
      })),
      recentSessions: sessions,
    },
  });
}
