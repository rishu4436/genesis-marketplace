import type { CategoryId } from "./categories";
import { getGenesisAgent, type GenesisAgent } from "./genesis-agents";
import type { HireIntent } from "./hire";
import {
  negotiateLive,
  priceToUsdHint,
} from "./erc8183-client";
import {
  a2aNegotiate,
  rangeKeeperPlatformConfig,
} from "./platform-a2a";

export type HireStatus =
  | "negotiating"
  | "quoted"
  | "funded"
  | "fulfilling"
  | "delivered"
  | "failed";

export type HireQuote = {
  priceUsd: number;
  currency: string;
  etaMinutes: number;
  protocol: "ERC-8183" | "ERC-8183-sim" | "ERC-8183-live";
  expiresAt: string;
  notes: string;
  providerSig?: string;
  rawPrice?: string;
  live?: boolean;
};

export type HireDeliverable = {
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  metrics: { label: string; value: string }[];
  disclaimer: string;
};

export type HireJob = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: HireStatus;
  chainId: number;
  tokenId: string;
  agentName: string;
  genesisSlug?: string;
  categoryId?: CategoryId | null;
  task: string;
  budgetUsd: string;
  duration: HireIntent["duration"];
  risk: HireIntent["risk"];
  notes?: string;
  quote?: HireQuote;
  deliverable?: HireDeliverable;
  timeline: { at: string; status: HireStatus; detail: string }[];
  serviceUrl?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function jobId() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pushTimeline(
  job: HireJob,
  status: HireStatus,
  detail: string,
): HireJob {
  const at = nowIso();
  return {
    ...job,
    status,
    updatedAt: at,
    timeline: [...job.timeline, { at, status, detail }],
  };
}

export function buildQuote(
  intent: Pick<
    HireIntent,
    "budgetUsd" | "duration" | "risk" | "categoryId"
  > & { genesisSlug?: string; agentName?: string },
): HireQuote {
  const g = intent.genesisSlug
    ? getGenesisAgent(intent.genesisSlug)
    : undefined;

  let price = g?.basePriceUsd ?? 9;
  if (intent.duration === "24h") price *= 1.5;
  if (intent.duration === "7d") price *= 3;
  if (intent.duration === "30d") price *= 8;
  if (intent.risk === "medium") price *= 1.15;
  if (intent.risk === "high") price *= 1.35;

  const budget = Number(intent.budgetUsd) || 0;
  if (budget > 0 && price > budget) {
    price = Math.max(budget * 0.95, (g?.basePriceUsd ?? 5) * 0.8);
  }

  const eta =
    (g?.etaMinutes ?? 3) +
    (intent.risk === "high" ? 2 : 0) +
    (intent.duration === "once" ? 0 : 1);

  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return {
    priceUsd: Math.round(price * 100) / 100,
    currency: "USD",
    etaMinutes: eta,
    protocol: "ERC-8183-sim",
    expiresAt: expires,
    notes: g
      ? `Local quote for ${g.name}. Prefer live /apex/negotiate when serviceUrl is reachable.`
      : "Marketplace simulated quote.",
    live: false,
  };
}

export function createNegotiatedJob(input: {
  chainId: number;
  tokenId: string;
  agentName: string;
  genesisSlug?: string;
  categoryId?: CategoryId | null;
  task: string;
  budgetUsd: string;
  duration: HireIntent["duration"];
  risk: HireIntent["risk"];
  notes?: string;
  serviceUrl?: string;
}): HireJob {
  const id = jobId();
  const createdAt = nowIso();
  let job: HireJob = {
    id,
    createdAt,
    updatedAt: createdAt,
    status: "negotiating",
    chainId: input.chainId,
    tokenId: input.tokenId,
    agentName: input.agentName,
    genesisSlug: input.genesisSlug,
    categoryId: input.categoryId,
    task: input.task,
    budgetUsd: input.budgetUsd,
    duration: input.duration,
    risk: input.risk,
    notes: input.notes,
    serviceUrl: input.serviceUrl,
    timeline: [],
  };

  job = pushTimeline(job, "negotiating", "POST negotiate — buyer brief received");
  const quote = buildQuote(input);
  job = {
    ...pushTimeline(
      job,
      "quoted",
      `Agent quoted $${quote.priceUsd} · ETA ${quote.etaMinutes}m`,
    ),
    quote,
  };
  return job;
}

/**
 * Prefer live APEX negotiate (Studio Layer B or local /api/apex/:slug).
 * Falls back to in-process sim if live call fails.
 */
export async function createJobWithLiveNegotiate(input: {
  chainId: number;
  tokenId: string;
  agentName: string;
  genesisSlug?: string;
  categoryId?: CategoryId | null;
  task: string;
  budgetUsd: string;
  duration: HireIntent["duration"];
  risk: HireIntent["risk"];
  notes?: string;
  autoFulfill?: boolean;
}): Promise<HireJob> {
  const g = input.genesisSlug
    ? getGenesisAgent(input.genesisSlug)
    : undefined;
  const serviceUrl = g?.serviceUrl;

  const id = jobId();
  const createdAt = nowIso();
  let job: HireJob = {
    id,
    createdAt,
    updatedAt: createdAt,
    status: "negotiating",
    chainId: input.chainId,
    tokenId: input.tokenId,
    agentName: input.agentName,
    genesisSlug: input.genesisSlug,
    categoryId: input.categoryId,
    task: input.task,
    budgetUsd: input.budgetUsd,
    duration: input.duration,
    risk: input.risk,
    notes: input.notes,
    serviceUrl,
    timeline: [],
  };

  job = pushTimeline(
    job,
    "negotiating",
    serviceUrl
      ? `POST ${serviceUrl}/negotiate`
      : "Local sim negotiate (no serviceUrl)",
  );

  // Platform A2A path (RangeKeeper managed deploy)
  const isPlatform =
    input.genesisSlug === "range-keeper" &&
    (serviceUrl?.includes("bnbagent-api.bnbchain.world") ||
      Boolean(process.env.RANGEKEEPER_AGENT_ID));

  if (isPlatform) {
    try {
      const cfg = rangeKeeperPlatformConfig();
      job = pushTimeline(
        job,
        "negotiating",
        `A2A negotiate → ${cfg.a2aUrl}`,
      );
      const a2a = await a2aNegotiate({
        a2aUrl: cfg.a2aUrl,
        agentId: cfg.agentId,
        taskDescription: input.task,
        terms: {
          deliverables: "PCS V3 LP rebalance plan",
          quality_standards: input.notes || "marketplace hire",
        },
      });

      if (a2a.ok) {
        const priceUsd =
          priceToUsdHint(a2a.price, a2a.price_usd) ?? buildQuote(input).priceUsd;
        job = {
          ...pushTimeline(
            job,
            "quoted",
            `Platform A2A quote OK · ~$${priceUsd} (live RangeKeeper)`,
          ),
          quote: {
            priceUsd,
            currency: a2a.currency || "U",
            etaMinutes: g?.etaMinutes ?? 2,
            protocol: "ERC-8183-live",
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            notes: "Signed quote from BNB platform RangeKeeper (A2A)",
            providerSig: a2a.provider_sig,
            rawPrice: a2a.price != null ? String(a2a.price) : undefined,
            live: true,
          },
        };
        // Full on-chain fund+notify is separate; deliver local plan so UI completes
        if (input.autoFulfill !== false) {
          job = fulfillJob(job);
          job = pushTimeline(
            job,
            "delivered",
            "Local deliverable attached; on-chain notify_funded needs funded job_id + tBNB",
          );
        }
        return job;
      }

      job = pushTimeline(
        job,
        "negotiating",
        `A2A negotiate failed — ${a2a.error || "unknown"} — falling back`,
      );
    } catch (e) {
      job = pushTimeline(
        job,
        "negotiating",
        `A2A error — ${e instanceof Error ? e.message : "error"} — fallback`,
      );
    }
  }

  if (serviceUrl && !isPlatform) {
    try {
      const { ok, data } = await negotiateLive(serviceUrl, {
        task_description: input.task,
        terms: {
          deliverables: "structured brief",
          quality_standards: input.notes || "marketplace hire",
          budget_usd: input.budgetUsd,
          duration: input.duration,
          risk: input.risk,
          category: input.categoryId || undefined,
          auto_fulfill: input.autoFulfill !== false,
        },
      });

      if (ok && data.accepted !== false) {
        const priceUsd =
          priceToUsdHint(data.price as string | number, data.price_usd) ??
          buildQuote(input).priceUsd;
        const eta =
          typeof data.eta_minutes === "number"
            ? data.eta_minutes
            : g?.etaMinutes ?? 3;
        const expires =
          (data.quote_expires_at as string) ||
          new Date(Date.now() + 5 * 60 * 1000).toISOString();

        const isLocalApex = serviceUrl.includes("/api/apex/");
        job = {
          ...pushTimeline(
            job,
            "quoted",
            `Live negotiate OK · $${priceUsd} · ${isLocalApex ? "local APEX" : "external service"}`,
          ),
          quote: {
            priceUsd,
            currency: (data.currency as string) || "USD",
            etaMinutes: eta as number,
            protocol: isLocalApex ? "ERC-8183" : "ERC-8183-live",
            expiresAt: expires,
            notes: (data.notes as string) || "Live APEX quote",
            providerSig: data.provider_sig as string | undefined,
            rawPrice: data.price != null ? String(data.price) : undefined,
            live: !isLocalApex,
          },
        };

        if (data.deliverable && typeof data.deliverable === "object") {
          job = fulfillFromEmbedded(job, data.deliverable as HireDeliverable);
        } else if (input.autoFulfill !== false) {
          job = fulfillJob(job);
        }
        return job;
      }

      job = pushTimeline(
        job,
        "negotiating",
        `Live negotiate failed — falling back to sim (${data.error || "not accepted"})`,
      );
    } catch (e) {
      job = pushTimeline(
        job,
        "negotiating",
        `Live negotiate error — sim fallback (${e instanceof Error ? e.message : "error"})`,
      );
    }
  }

  // Sim path
  const quote = buildQuote(input);
  job = {
    ...pushTimeline(
      job,
      "quoted",
      `Sim quoted $${quote.priceUsd} · ETA ${quote.etaMinutes}m`,
    ),
    quote,
  };
  if (input.autoFulfill !== false) {
    job = fulfillJob(job);
  }
  return job;
}

function fulfillFromEmbedded(
  job: HireJob,
  deliverable: HireDeliverable,
): HireJob {
  let next = job;
  if (next.status === "quoted") {
    next = pushTimeline(
      next,
      "funded",
      "Job funded (simulated escrow — no user fund custody)",
    );
  }
  next = pushTimeline(next, "fulfilling", "Applying embedded deliverable");
  next = {
    ...pushTimeline(next, "delivered", "Deliverable ready"),
    deliverable,
  };
  return next;
}

export function fundJob(job: HireJob): HireJob {
  if (job.status !== "quoted" && job.status !== "funded") {
    return job;
  }
  return pushTimeline(
    job,
    "funded",
    "Job marked funded (simulated escrow — no user fund custody on Genesis)",
  );
}

export function fulfillJob(job: HireJob): HireJob {
  let next = job;
  if (next.status === "quoted") {
    next = fundJob(next);
  }
  if (next.status !== "funded" && next.status !== "fulfilling") {
    return next;
  }
  next = pushTimeline(next, "fulfilling", "Agent fulfilling job…");
  const deliverable = buildDeliverable(next);
  next = {
    ...pushTimeline(next, "delivered", "Deliverable ready"),
    deliverable,
  };
  return next;
}

function buildDeliverable(job: HireJob): HireDeliverable {
  const g = job.genesisSlug ? getGenesisAgent(job.genesisSlug) : undefined;
  const cat = job.categoryId || g?.categoryId;

  switch (cat) {
    case "rebalancing":
      return rebalanceDeliverable(job, g);
    case "grid-trading":
      return gridDeliverable(job, g);
    case "yield-optimisation":
      return yieldDeliverable(job, g);
    case "health-factor":
      return healthDeliverable(job, g);
    default:
      return genericDeliverable(job, g);
  }
}

function rebalanceDeliverable(
  job: HireJob,
  g?: GenesisAgent,
): HireDeliverable {
  return {
    title: "LP rebalance plan · PancakeSwap V3",
    summary:
      "Position is estimated slightly out of active range under a ±4% move. Proposed reset keeps 80% notional in-range with a fee-first band.",
    sections: [
      { heading: "Task received", body: job.task },
      {
        heading: "Current range diagnosis",
        body: "Simulated PCS V3 position: price near lower tick. Time-out-of-range last 24h ≈ 38%. Fee capture degraded vs in-range baseline.",
      },
      {
        heading: "Proposed band",
        body: "Center on mark ±6.5% (asymmetric +1% up for mild bull bias). Keep 10% dry powder for a second rebalance if volatility expands.",
      },
      {
        heading: "PancakeSwap notes",
        body: "Plan assumes PCS V3 pool. No custody: execute rebalance in your wallet or via a scoped session key.",
      },
    ],
    metrics: [
      { label: "Est. fee APR (in-range)", value: "18–26%" },
      { label: "Est. IL (7d, ±8% move)", value: "1.1–1.8%" },
      { label: "Suggested gas budget", value: "$1.20–$2.40" },
      { label: "Agent", value: g?.name || job.agentName },
    ],
    disclaimer:
      "Simulated deliverable for marketplace demo. Not financial advice. No funds moved on-chain by Genesis.",
  };
}

function gridDeliverable(job: HireJob, g?: GenesisAgent): HireDeliverable {
  return {
    title: "Grid layout · BSC pair",
    summary:
      "12-level geometric grid with pause if unrealized drawdown exceeds 6%. Sized for the budget you specified.",
    sections: [
      { heading: "Task received", body: job.task },
      {
        heading: "Grid parameters",
        body: "Levels: 12 · Mode: geometric · Spacing: ~1.1% · Inventory split 50/50 quote-base at mid.",
      },
      {
        heading: "Risk controls",
        body: `Risk posture: ${job.risk}. Auto-pause if mark moves >6% against inventory.`,
      },
      {
        heading: "24h fill simulation",
        body: "Under mean-reverting path: ~7–9 fills, est. edge 0.15–0.35% of notional before fees.",
      },
    ],
    metrics: [
      { label: "Levels", value: "12" },
      { label: "Spacing", value: "~1.1%" },
      { label: "Pause DD", value: "6%" },
      { label: "Agent", value: g?.name || job.agentName },
    ],
    disclaimer: "Simulated strategy brief. Grid execution not submitted on-chain by Genesis.",
  };
}

function yieldDeliverable(job: HireJob, g?: GenesisAgent): HireDeliverable {
  return {
    title: "Yield route · BSC stables / majors",
    summary:
      "Ranked venues for capital with risk bands. Top suggestion balances APR vs exit liquidity, with PCS farm in the shortlist.",
    sections: [
      { heading: "Task received", body: job.task },
      {
        heading: "Venue ranking (illustrative)",
        body: "1) Lending blue-chip · 2) PCS farm / gauge · 3) LST restake path. Prefer #1+#2 barbell under medium risk.",
      },
      {
        heading: "Reallocation sketch",
        body: `Budget constraint $${job.budgetUsd}. Move in 2 txs: 60% lending, 40% PCS-related yield.`,
      },
      {
        heading: "PancakeSwap angle",
        body: "Where LP yield wins on risk-adjusted basis, use PCS pools with deep liquidity.",
      },
    ],
    metrics: [
      { label: "Top band APR", value: "7–14% (risk-adj.)" },
      { label: "Suggested split", value: "60/40" },
      { label: "Re-check", value: "48h" },
      { label: "Agent", value: g?.name || job.agentName },
    ],
    disclaimer: "Simulated yield brief. APRs change; verify live before moving capital.",
  };
}

function healthDeliverable(job: HireJob, g?: GenesisAgent): HireDeliverable {
  return {
    title: "Health factor protection plan",
    summary:
      "Simulated HF under collateral shocks with clear repay vs add-collateral options and alert thresholds.",
    sections: [
      { heading: "Task received", body: job.task },
      {
        heading: "Baseline (illustrative)",
        body: "Assumed HF ≈ 1.45. Soft alert at 1.30, hard alert at 1.20.",
      },
      {
        heading: "Shock table",
        body: "Collateral −10% → HF ~1.28 · −15% → HF ~1.18 · −20% → HF ~1.08.",
      },
      {
        heading: "Actions",
        body: "Prefer partial repay if inventory is liquid; else add collateral of the strongest asset.",
      },
    ],
    metrics: [
      { label: "Soft alert", value: "HF 1.30" },
      { label: "Hard alert", value: "HF 1.20" },
      { label: "Primary action", value: "Partial repay" },
      { label: "Agent", value: g?.name || job.agentName },
    ],
    disclaimer:
      "Simulated HF model. Read live protocol data before acting. Genesis does not hold keys to your lending account.",
  };
}

function genericDeliverable(job: HireJob, g?: GenesisAgent): HireDeliverable {
  return {
    title: "Agent job result",
    summary: "Marketplace hire completed with a structured brief for your task.",
    sections: [
      { heading: "Task", body: job.task },
      {
        heading: "Result",
        body: "Agent produced a completion packet under the quoted budget and risk posture.",
      },
    ],
    metrics: [
      { label: "Status", value: "delivered" },
      { label: "Agent", value: g?.name || job.agentName },
      { label: "Quote", value: job.quote ? `$${job.quote.priceUsd}` : "—" },
    ],
    disclaimer: "Simulated ERC-8183 job for Genesis Marketplace demo.",
  };
}
