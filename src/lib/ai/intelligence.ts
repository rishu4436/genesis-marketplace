/**
 * Genesis AI Intelligence Layer
 * High-value marketplace brain — not a chatbot wrapper.
 *
 * Capabilities:
 *  1. Orchestrate — intent → ranked agents + plan of attack + brief rewrite
 *  2. Enrich report — elevate full analysis with Grok synthesis
 *  3. Concierge — multi-step hire advice grounded in catalog + buyer context
 *
 * Always falls back to deterministic engines when XAI_API_KEY is missing.
 */

import {
  allGenesisAgents,
  genesisBuyHref,
  type GenesisAgent,
} from "@/lib/genesis-agents";
import { matchAgentsForJob } from "@/lib/intent-match";
import type { BuyerContext } from "@/lib/buyer-context";
import { summarizeBuyerContext } from "@/lib/buyer-context";
import type { HireDeliverable } from "@/lib/hire-engine";
import { hasXaiKey, safeJsonParse, xaiChat } from "./xai-client";
import { getCategory } from "@/lib/categories";

export type AiAgentPick = {
  slug: string;
  name: string;
  categoryId: string;
  score: number;
  why: string;
  buyHref: string;
  priceUsd: number;
  etaMinutes: number;
};

export type OrchestrateResult = {
  ai: boolean;
  model?: string;
  intent: {
    summary: string;
    categoryHint: string | null;
    urgency: "low" | "medium" | "high";
    capitalAtRisk: string;
  };
  rewrittenBrief: string;
  picks: AiAgentPick[];
  planOfAttack: string[];
  risks: string[];
  nextAction: string;
  fallbackReason?: string;
};

export type ConciergeResult = {
  ai: boolean;
  answer: string;
  picks: AiAgentPick[];
  suggestedTask?: string;
  cta?: { label: string; href: string };
  fallbackReason?: string;
};

function catalogBlurb(): string {
  return allGenesisAgents()
    .map(
      (a) =>
        `- ${a.slug} | ${a.name} | cat=${a.categoryId} | $${a.basePriceUsd} | ${a.etaMinutes}m | skills=${a.skills.join(", ")} | ${a.tagline}`,
    )
    .join("\n");
}

function picksFromMatch(q: string, limit = 3): AiAgentPick[] {
  const { matches, normalizedTask } = matchAgentsForJob(q, limit);
  return matches.map((m) => ({
    slug: m.agent.slug,
    name: m.agent.name,
    categoryId: m.agent.categoryId,
    score: Math.round(m.score),
    why: m.reasons.join("; "),
    buyHref: `${genesisBuyHref(m.agent, { task: normalizedTask, buy: true })}`,
    priceUsd: m.agent.basePriceUsd,
    etaMinutes: m.agent.etaMinutes,
  }));
}

function agentBySlug(slug: string): GenesisAgent | undefined {
  return allGenesisAgents().find((a) => a.slug === slug);
}

/** Primary marketplace brain: intent → match → plan */
export async function orchestrateHire(opts: {
  query: string;
  buyerContext?: BuyerContext | null;
}): Promise<OrchestrateResult> {
  const q = opts.query.trim();
  const fallbackPicks = picksFromMatch(q, 3);
  const det = matchAgentsForJob(q, 3);

  const base: OrchestrateResult = {
    ai: false,
    intent: {
      summary: q.slice(0, 160),
      categoryHint: det.categoryId,
      urgency: "medium",
      capitalAtRisk: "unknown",
    },
    rewrittenBrief: det.normalizedTask || q,
    picks: fallbackPicks,
    planOfAttack: [
      "Open top specialist and run Free scan",
      "Attach buyer context, run Full analysis",
      "Execute checklist yourself — agent never holds keys",
    ],
    risks: [
      "Deterministic match only — enable XAI_API_KEY for Grok orchestration",
    ],
    nextAction: fallbackPicks[0]
      ? `Buy ${fallbackPicks[0].name} with Full analysis`
      : "Browse categories",
    fallbackReason: hasXaiKey() ? undefined : "XAI_API_KEY not set",
  };

  if (!hasXaiKey() || q.length < 6) return base;

  const buyer =
    opts.buyerContext != null
      ? summarizeBuyerContext(opts.buyerContext)
      : "No buyer portfolio attached.";

  const system = `You are Genesis Marketplace Intelligence — the ranking and routing brain for a BNB Smart Chain AI agent marketplace.
You do NOT move funds. You recommend specialist agents and craft hire briefs.
Specialists catalog:
${catalogBlurb()}

Return ONLY valid JSON with this shape:
{
  "intent": { "summary": string, "categoryHint": string|null, "urgency": "low"|"medium"|"high", "capitalAtRisk": string },
  "rewrittenBrief": string,
  "picks": [ { "slug": string, "score": number, "why": string } ],
  "planOfAttack": string[],
  "risks": string[],
  "nextAction": string
}
Rules:
- picks.slug MUST be one of: range-keeper, gridwright, yield-router, health-sentinel
- rank 2-3 agents, scores 0-100
- rewrittenBrief must be specific (pairs, %, protocol, budget when possible)
- planOfAttack 3-5 concrete steps for the human buyer
- Be sharp, DeFi-native, no hype fluff`;

  const user = `Buyer query:\n${q}\n\nBuyer context:\n${buyer}`;

  const res = await xaiChat({
    system,
    user,
    json: true,
    temperature: 0.25,
    maxTokens: 1800,
  });

  if (!res.ok) {
    return { ...base, fallbackReason: res.error };
  }

  type Raw = {
    intent?: OrchestrateResult["intent"];
    rewrittenBrief?: string;
    picks?: { slug: string; score: number; why: string }[];
    planOfAttack?: string[];
    risks?: string[];
    nextAction?: string;
  };
  const raw = safeJsonParse<Raw>(res.text);
  if (!raw) return { ...base, fallbackReason: "Invalid AI JSON" };

  const picks: AiAgentPick[] = (raw.picks || [])
    .map((p) => {
      const a = agentBySlug(p.slug);
      if (!a) return null;
      const brief = raw.rewrittenBrief || q;
      return {
        slug: a.slug,
        name: a.name,
        categoryId: a.categoryId,
        score: Math.min(100, Math.max(0, Number(p.score) || 0)),
        why: p.why || "Strong category fit",
        buyHref: `/genesis/${a.slug}#buy?task=${encodeURIComponent(brief)}`,
        priceUsd: a.basePriceUsd,
        etaMinutes: a.etaMinutes,
      } satisfies AiAgentPick;
    })
    .filter(Boolean) as AiAgentPick[];

  return {
    ai: true,
    model: process.env.XAI_MODEL || "grok-4.5",
    intent: {
      summary: raw.intent?.summary || base.intent.summary,
      categoryHint: raw.intent?.categoryHint ?? det.categoryId,
      urgency: raw.intent?.urgency || "medium",
      capitalAtRisk: raw.intent?.capitalAtRisk || "unknown",
    },
    rewrittenBrief: raw.rewrittenBrief || base.rewrittenBrief,
    picks: picks.length ? picks : fallbackPicks,
    planOfAttack:
      raw.planOfAttack?.length ? raw.planOfAttack : base.planOfAttack,
    risks: raw.risks?.length ? raw.risks : base.risks,
    nextAction: raw.nextAction || base.nextAction,
  };
}

/** Elevate a structured deliverable with AI synthesis (keeps metrics) */
export async function enrichDeliverableWithAi(opts: {
  deliverable: HireDeliverable;
  task: string;
  agentName: string;
  categoryId?: string | null;
  buyerSummary?: string;
}): Promise<{ deliverable: HireDeliverable; ai: boolean; error?: string }> {
  if (!hasXaiKey()) {
    return { deliverable: opts.deliverable, ai: false, error: "no key" };
  }

  const cat = opts.categoryId
    ? getCategory(opts.categoryId as never)?.name
    : "DeFi";

  const system = `You are a senior ${cat} strategist writing the executive layer of a marketplace agent report on BNB Smart Chain.
You receive a structured specialist plan. Improve clarity and decision quality WITHOUT inventing fake on-chain balances.
Return ONLY JSON:
{
  "title": string,
  "summary": string,
  "executiveBrief": string,
  "hardRecommendation": string,
  "priorityActions": string[],
  "whatNotToDo": string[],
  "confidenceNote": string
}
Tone: precise, institutional, no hype. Plan-only — never claim you moved funds.`;

  const user = JSON.stringify({
    task: opts.task,
    agent: opts.agentName,
    buyer: opts.buyerSummary || null,
    existingTitle: opts.deliverable.title,
    existingSummary: opts.deliverable.summary,
    sections: opts.deliverable.sections.slice(0, 8),
    metrics: opts.deliverable.metrics,
  });

  const res = await xaiChat({
    system,
    user,
    json: true,
    temperature: 0.3,
    maxTokens: 2500,
  });

  if (!res.ok) {
    return { deliverable: opts.deliverable, ai: false, error: res.error };
  }

  type Enrich = {
    title?: string;
    summary?: string;
    executiveBrief?: string;
    hardRecommendation?: string;
    priorityActions?: string[];
    whatNotToDo?: string[];
    confidenceNote?: string;
  };
  const en = safeJsonParse<Enrich>(res.text);
  if (!en) {
    return { deliverable: opts.deliverable, ai: false, error: "bad json" };
  }

  const aiSections = [
    {
      heading: "AI executive brief",
      body: en.executiveBrief || en.summary || opts.deliverable.summary,
    },
    {
      heading: "AI hard recommendation",
      body: en.hardRecommendation || "See specialist sections below.",
    },
    {
      heading: "Priority actions (AI-ranked)",
      body: (en.priorityActions || [])
        .map((a, i) => `${i + 1}. ${a}`)
        .join("\n") || "Follow checklist below.",
    },
    {
      heading: "What not to do",
      body: (en.whatNotToDo || []).map((a) => `• ${a}`).join("\n") || "—",
    },
    ...(en.confidenceNote
      ? [{ heading: "Confidence note", body: en.confidenceNote }]
      : []),
  ];

  return {
    ai: true,
    deliverable: {
      ...opts.deliverable,
      title: en.title || opts.deliverable.title,
      summary: en.summary || opts.deliverable.summary,
      sections: [...aiSections, ...opts.deliverable.sections],
      metrics: [
        ...opts.deliverable.metrics,
        { label: "AI layer", value: "Grok enriched" },
      ],
      disclaimer:
        opts.deliverable.disclaimer +
        " AI layer via SpaceXAI/xAI synthesizes the specialist plan — verify live venues before capital moves.",
    },
  };
}

/** Conversational hire advisor grounded in catalog */
export async function conciergeChat(opts: {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
  buyerContext?: BuyerContext | null;
}): Promise<ConciergeResult> {
  const fallbackPicks = picksFromMatch(opts.message, 2);
  if (!hasXaiKey()) {
    return {
      ai: false,
      answer:
        fallbackPicks[0]
          ? `Based on rules matching, start with **${fallbackPicks[0].name}** (${fallbackPicks[0].why}). Set XAI_API_KEY for Grok concierge.`
          : "Describe a DeFi job (rebalance, grid, yield, health factor). Set XAI_API_KEY for AI concierge.",
      picks: fallbackPicks,
      suggestedTask: opts.message,
      cta: fallbackPicks[0]
        ? { label: `Open ${fallbackPicks[0].name}`, href: fallbackPicks[0].buyHref }
        : { label: "Browse", href: "/hire" },
      fallbackReason: "XAI_API_KEY not set",
    };
  }

  const buyer =
    opts.buyerContext != null
      ? summarizeBuyerContext(opts.buyerContext)
      : "none";

  const hist = (opts.history || [])
    .slice(-6)
    .map((h) => `${h.role}: ${h.content}`)
    .join("\n");

  const system = `You are Genesis Concierge — the AI front door of a BNB agent marketplace for DeFi specialists (LP rebalance, grid, yield, health factor).
You help humans hire the right agent. You never custody funds.
Catalog:
${catalogBlurb()}

Return ONLY JSON:
{
  "answer": string (markdown ok, concise),
  "picks": [ { "slug": string, "score": number, "why": string } ],
  "suggestedTask": string,
  "ctaLabel": string,
  "ctaSlug": string
}
ctaSlug must be a catalog slug or "hire" or "browse".`;

  const user = `History:\n${hist || "(new)"}\n\nBuyer context:\n${buyer}\n\nUser:\n${opts.message}`;

  const res = await xaiChat({
    system,
    user,
    json: true,
    temperature: 0.4,
    maxTokens: 1600,
  });

  if (!res.ok) {
    return {
      ai: false,
      answer: `AI unavailable (${res.error}). Try /hire specialists.`,
      picks: fallbackPicks,
      fallbackReason: res.error,
    };
  }

  type Raw = {
    answer?: string;
    picks?: { slug: string; score: number; why: string }[];
    suggestedTask?: string;
    ctaLabel?: string;
    ctaSlug?: string;
  };
  const raw = safeJsonParse<Raw>(res.text);
  if (!raw?.answer) {
    return {
      ai: false,
      answer: "Could not parse AI response.",
      picks: fallbackPicks,
    };
  }

  const picks: AiAgentPick[] = (raw.picks || [])
    .map((p) => {
      const a = agentBySlug(p.slug);
      if (!a) return null;
      const task = raw.suggestedTask || opts.message;
      return {
        slug: a.slug,
        name: a.name,
        categoryId: a.categoryId,
        score: Math.min(100, Math.max(0, Number(p.score) || 70)),
        why: p.why,
        buyHref: `/genesis/${a.slug}#buy?task=${encodeURIComponent(task)}`,
        priceUsd: a.basePriceUsd,
        etaMinutes: a.etaMinutes,
      };
    })
    .filter(Boolean) as AiAgentPick[];

  let href = "/hire";
  if (raw.ctaSlug && agentBySlug(raw.ctaSlug)) {
    href = `/genesis/${raw.ctaSlug}#buy?task=${encodeURIComponent(raw.suggestedTask || opts.message)}`;
  } else if (raw.ctaSlug === "browse") href = "/browse";
  else if (picks[0]) href = picks[0].buyHref;

  return {
    ai: true,
    answer: raw.answer,
    picks: picks.length ? picks : fallbackPicks,
    suggestedTask: raw.suggestedTask,
    cta: { label: raw.ctaLabel || "Continue", href },
  };
}
