import { NextResponse } from "next/server";
import { hasXaiKey, AI_MODEL } from "@/lib/ai/xai-client";

export const runtime = "nodejs";

/** GET /api/ai/status — whether marketplace AI is live */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      enabled: hasXaiKey(),
      provider: "SpaceXAI / xAI",
      model: AI_MODEL,
      features: [
        "orchestrate",
        "concierge",
        "report-enrichment",
      ],
    },
  });
}
