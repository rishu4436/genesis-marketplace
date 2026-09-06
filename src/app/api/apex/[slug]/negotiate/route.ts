import { NextResponse } from "next/server";
import { getGenesisAgent } from "@/lib/genesis-agents";
import { buildQuote, createNegotiatedJob, fulfillJob } from "@/lib/hire-engine";
import type { CategoryId } from "@/lib/categories";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * APEX-compatible negotiate endpoint for Genesis sellers.
 * Shape aligns with Studio Layer B: POST /apex/negotiate
 * When you deploy real bag services, point pins.serviceUrl there instead.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const agent = getGenesisAgent(slug);
  if (!agent) {
    return NextResponse.json(
      { accepted: false, error: "Unknown Genesis agent" },
      { status: 404 },
    );
  }

  let body: {
    task_description?: string;
    terms?: {
      deliverables?: string;
      quality_standards?: string;
      budget_usd?: string;
      duration?: string;
      risk?: string;
      category?: string;
      auto_fulfill?: boolean;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { accepted: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const task = body.task_description?.trim();
  if (!task) {
    return NextResponse.json(
      { accepted: false, error: "task_description required" },
      { status: 400 },
    );
  }

  const duration = (body.terms?.duration || "once") as
    | "once"
    | "24h"
    | "7d"
    | "30d";
  const risk = (body.terms?.risk || agent.riskDefault) as
    | "low"
    | "medium"
    | "high";
  const budgetUsd = body.terms?.budget_usd || String(agent.basePriceUsd * 2);

  const quote = buildQuote({
    budgetUsd,
    duration,
    risk,
    categoryId: agent.categoryId,
    genesisSlug: agent.slug,
    agentName: agent.name,
  });

  // Price in wei-like units for Studio-shaped clients (1 USD ≈ 1e18 for demo stable)
  const priceWei = BigInt(Math.round(quote.priceUsd * 1e6)) * BigInt(1e12);

  const expires = quote.expiresAt;
  const autoFulfill = body.terms?.auto_fulfill !== false;

  let deliverable: unknown = undefined;
  if (autoFulfill) {
    let job = createNegotiatedJob({
      chainId: agent.chainId ?? 56,
      tokenId: agent.tokenId || `genesis:${agent.slug}`,
      agentName: agent.name,
      genesisSlug: agent.slug,
      categoryId: agent.categoryId as CategoryId,
      task,
      budgetUsd,
      duration,
      risk,
      notes: body.terms?.quality_standards,
    });
    job = fulfillJob(job);
    deliverable = job.deliverable;
  }

  return NextResponse.json({
    accepted: true,
    request: {
      task_description: task,
      terms: body.terms || {},
    },
    price: priceWei.toString(),
    price_usd: quote.priceUsd,
    currency: "USD-sim",
    chain_id: agent.chainId ?? 56,
    provider: agent.name,
    provider_slug: agent.slug,
    protocol: "ERC-8183-sim",
    quote_expires_at: expires,
    eta_minutes: quote.etaMinutes,
    // Demo sig placeholder — real Studio agents return EIP-191 provider_sig
    provider_sig: `genesis-sim:${slug}:${Buffer.from(task).toString("base64url").slice(0, 32)}`,
    deliverable,
    notes: quote.notes,
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const agent = getGenesisAgent(slug);
  if (!agent) {
    return NextResponse.json({ status: "error" }, { status: 404 });
  }
  return NextResponse.json({
    status: "ok",
    keyless: true,
    service: "genesis-apex-sim",
    agent: agent.name,
    slug: agent.slug,
    category: agent.categoryId,
  });
}
