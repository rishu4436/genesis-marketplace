import { NextResponse } from "next/server";
import { DESK, JOB_SKUS } from "@/lib/desk";
import { siteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/** Marketplace A2A card — other agents should discover Genesis here. */
export async function GET() {
  const origin = siteUrl();
  return NextResponse.json({
    protocolVersion: "0.2.1",
    name: "Genesis Marketplace",
    description: DESK.oneLiner,
    url: `${origin}/api/v1/hire`,
    preferredTransport: "JSONRPC",
    skills: JOB_SKUS.map((s) => ({
      id: s.categoryId,
      name: s.job,
      description: `${s.proof}. Rail ${s.priceRail}. POST /api/hire with genesisSlug ${s.defaultSeller}.`,
    })),
    documentationUrl: `${origin}/for-agents`,
    additionalInterfaces: [
      { url: `${origin}/api/v1/agents`, transport: "HTTP+JSON" },
      { url: `${origin}/api/v1/desk`, transport: "HTTP+JSON" },
    ],
  });
}
