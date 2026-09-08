/**
 * Full report engine — stockanalyst-quality structure for Genesis specialists.
 * Combines: brief parse + market sources + buyer context + expert plan.
 */

import type { CategoryId } from "./categories";
import type { GenesisAgent } from "./genesis-agents";
import type { HireDeliverable, HireJob } from "./hire-engine";
import {
  buildExpertDeliverable,
  parseBrief,
} from "./agent-specialists";
import type { BuyerContext } from "./buyer-context";
import {
  positionsForCategory,
  summarizeBuyerContext,
} from "./buyer-context";
import {
  buildThesis,
  fetchMarketSnapshot,
  formatMarketSection,
} from "./defi-analysis";
import type { CommerceTier } from "./agent-model";
import { enrichDeliverableWithAi } from "./ai/intelligence";
import {
  fetchOnchainMarket,
  fetchPcsNftPosition,
  fetchVenusAccount,
  formatOnchainSection,
  formatPcsNftSection,
  formatVenusAccountSection,
} from "./onchain-market";
import { hasXaiKey } from "./ai/xai-client";

export type FreeScanResult = {
  tier: "free";
  title: string;
  summary: string;
  metrics: { label: string; value: string }[];
  sources: string[];
  recommendation: string;
  disclaimer: string;
};

function tickersFromBrief(task: string, categoryId?: CategoryId | null): string[] {
  const p = parseBrief(task);
  const out: string[] = [];
  if (p.pair) {
    const [a, b] = p.pair.split("-");
    if (a) out.push(a);
    if (b) out.push(b);
  }
  if (p.asset) out.push(p.asset);
  if (out.length === 0) {
    if (categoryId === "rebalancing") out.push("CAKE", "USDT");
    else if (categoryId === "grid-trading") out.push("BNB", "USDT");
    else out.push("USDT", "BNB");
  }
  return out;
}

export async function buildFreeScan(job: {
  task: string;
  categoryId?: CategoryId | null;
  agentName: string;
  risk: string;
}): Promise<FreeScanResult> {
  const p = parseBrief(job.task);
  const ticks = tickersFromBrief(job.task, job.categoryId);
  const snaps = await fetchMarketSnapshot(ticks);
  const primary = snaps[0];
  const thesis = buildThesis({
    categoryId: job.categoryId,
    pairOrAsset: p.pair || p.asset || ticks[0] || "BSC",
    risk: job.risk,
    change24h: primary?.change24hPct,
  });

  return {
    tier: "free",
    title: `Free scan · ${job.agentName}`,
    summary: `Quick scan for: ${job.task.slice(0, 120)}${
      job.task.length > 120 ? "…" : ""
    }. Upgrade to Full analysis for checklist, thesis, and execution plan.`,
    metrics: [
      {
        label: "Pair/Asset",
        value: p.pair || p.asset || ticks.join(",") || "—",
      },
      {
        label: "Spot",
        value:
          primary?.priceUsd != null
            ? `$${primary.priceUsd.toLocaleString()}`
            : "n/a",
      },
      {
        label: "24h",
        value:
          primary?.change24hPct != null
            ? `${primary.change24hPct}%`
            : "n/a",
      },
      { label: "Fit hint", value: job.categoryId || "general" },
      { label: "Rec", value: thesis.recommendation.split("—")[0] || "REVIEW" },
    ],
    sources: snaps.flatMap((s) =>
      s.sources.map((x) => `${s.symbol}: ${x.name} [${x.status}]`),
    ),
    recommendation: thesis.recommendation,
    disclaimer:
      "Free scan only — not a full plan. Not financial advice. No funds moved.",
  };
}

export async function buildFullReport(
  job: HireJob,
  g?: GenesisAgent,
  buyer?: BuyerContext | null,
): Promise<HireDeliverable> {
  const base = buildExpertDeliverable(job, g);
  const p = parseBrief(job.task);
  const ticks = tickersFromBrief(job.task, job.categoryId);
  const snaps = await fetchMarketSnapshot(ticks);
  const marketBlock = formatMarketSection(snaps);
  let onchainBlock = "";
  try {
    onchainBlock = formatOnchainSection(await fetchOnchainMarket());
    if (p.nftId) {
      onchainBlock +=
        "\n\n" + formatPcsNftSection(await fetchPcsNftPosition(p.nftId));
    }
    if (p.wallet) {
      onchainBlock +=
        "\n\n" + formatVenusAccountSection(await fetchVenusAccount(p.wallet));
    }
  } catch {
    onchainBlock =
      "On-chain BSC read failed. Plan uses specialist math only — no invented tick or APR.";
  }
  const thesis = buildThesis({
    categoryId: job.categoryId,
    pairOrAsset: p.pair || p.asset || ticks[0] || "BSC",
    risk: job.risk,
    change24h: snaps[0]?.change24hPct,
  });

  const related = buyer
    ? positionsForCategory(buyer, job.categoryId)
    : [];
  const buyerBlock = buyer
    ? [
        {
          heading: "Buyer context (portfolio-aware)",
          body:
            summarizeBuyerContext(buyer) +
            (related.length
              ? `\n\nRelevant to this job:\n${related
                  .map(
                    (r) =>
                      `• ${r.kind} ${r.pairOrAsset} ~$${r.notionalUsd}${
                        r.costBasisUsd != null
                          ? ` · basis $${r.costBasisUsd} (Δ $${(
                              r.notionalUsd - r.costBasisUsd
                            ).toFixed(0)})`
                          : ""
                      }`,
                  )
                  .join("\n")}`
              : "\n\nNo matching positions — plan is general."),
        },
      ]
    : [
        {
          heading: "Buyer context",
          body: "No portfolio context attached. Add a buyer profile for personalised PnL notes (UOMP-style).",
        },
      ];

  const cat = job.categoryId;
  const onchainLead =
    cat === "grid-trading"
      ? "Grid context: live BNB/USDT tick below. You still place orders.\n\n"
      : cat === "yield-optimisation"
        ? "Yield context: Venus USDT supply APR is on-chain (not a promise). Pair it with the specialist venue ranking.\n\n"
        : cat === "health-factor"
          ? "Health context: Venus rates below are live. Shock HF with specialist math, not an invented oracle.\n\n"
          : "Rebalance context: PCS V3 slot0 ticks are live when RPC answers.\n\n";
  const onchainSection = {
    heading: "On-chain market (BSC)",
    body: onchainLead + onchainBlock,
  };

  const sourcesBlock = {
    heading: "Data sources",
    body:
      marketBlock +
      "\n\n• On-chain: PCS V3 slot0 + Venus supplyRatePerBlock (eth_call). Missing reads stay labeled unavailable.\n" +
      "• Specialist engine: band / grid / HF / venue math from the brief — not an invented tick or APR\n" +
      "• CoinGecko: spot fallback only\n" +
      `• Model: genesis-v2 · fetched ${snaps[0]?.fetchedAt || "n/a"}`,
  };

  const thesisBlock = {
    heading: "Bull / bear thesis",
    body: `BULL: ${thesis.bull}\n\nBEAR: ${thesis.bear}`,
  };

  const recBlock = {
    heading: "Hard recommendation",
    body: thesis.recommendation,
  };

  // Prepend market + context; keep specialist sections
  const sections = [
    onchainSection,
    sourcesBlock,
    ...buyerBlock,
    thesisBlock,
    recBlock,
    ...base.sections,
  ];

  const metrics = [
    ...base.metrics,
    {
      label: "Spot",
      value:
        snaps[0]?.priceUsd != null
          ? `$${snaps[0].priceUsd.toLocaleString()}`
          : "n/a",
    },
    { label: "Rec", value: thesis.recommendation.split(/[—-]/)[0].trim() },
  ];

  let deliverable: HireDeliverable = {
    title: base.title.includes("analysis")
      ? base.title
      : base.title.replace("plan", "full analysis"),
    summary: `${base.summary} Recommendation: ${thesis.recommendation}`,
    sections,
    metrics,
    disclaimer:
      base.disclaimer +
      " Multi-source snapshot may lag; verify live venues before capital moves.",
  };

  // AI enrichment layer (SpaceXAI / Grok) when key present
  if (hasXaiKey()) {
    try {
      const enriched = await enrichDeliverableWithAi({
        deliverable,
        task: job.task,
        agentName: job.agentName,
        categoryId: job.categoryId,
        buyerSummary: buyer ? summarizeBuyerContext(buyer) : undefined,
      });
      if (enriched.ai) deliverable = enriched.deliverable;
    } catch {
      /* keep structured report */
    }
  }

  return deliverable;
}

export async function buildReportForTier(
  tier: CommerceTier,
  job: HireJob,
  g?: GenesisAgent,
  buyer?: BuyerContext | null,
): Promise<HireDeliverable | FreeScanResult> {
  if (tier === "free") {
    return buildFreeScan({
      task: job.task,
      categoryId: job.categoryId,
      agentName: job.agentName,
      risk: job.risk,
    });
  }
  // full + escrow share full analysis payload
  return buildFullReport(job, g, buyer);
}
