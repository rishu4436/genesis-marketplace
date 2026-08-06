import type { CategoryId } from "./categories";
import { getGenesisAgent, type GenesisAgent } from "./genesis-agents";
import type { HireIntent } from "./hire";

export type HireStatus =
  | "negotiating"
  | "quoted"
  | "funded"
  | "fulfilling"
  | "delivered"
  | "failed";

export type HireQuote = {
  priceUsd: number;
  currency: "USD";
  etaMinutes: number;
  protocol: "ERC-8183-sim";
  expiresAt: string;
  notes: string;
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
      ? `Quote from Genesis seller ${g.name}. Simulated ERC-8183 negotiate — swap to live serviceUrl when Studio agent is deployed.`
      : "Marketplace quote (simulated ERC-8183 negotiate). Wire agent service endpoint for production settle.",
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
    timeline: [],
  };

  job = pushTimeline(job, "negotiating", "POST /negotiate — buyer brief received");
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
      {
        heading: "Task received",
        body: job.task,
      },
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
        body: "Plan assumes PCS V3 pool. No custody: execute rebalance in your wallet or via a scoped session key. Prefer single-sided add only if inventory already skewed.",
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
      {
        heading: "Task received",
        body: job.task,
      },
      {
        heading: "Grid parameters",
        body: "Levels: 12 · Mode: geometric · Spacing: ~1.1% · Inventory split 50/50 quote-base at mid. Upper/lower bounds derived from 7d high-low ±0.5%.",
      },
      {
        heading: "Risk controls",
        body: `Risk posture: ${job.risk}. Auto-pause if mark moves >6% against inventory or 24h volume collapses >70% vs 7d median.`,
      },
      {
        heading: "24h fill simulation",
        body: "Under mean-reverting path: ~7–9 fills, est. edge 0.15–0.35% of notional before fees. High-vol path: more fills, wider adverse selection — keep pause rule on.",
      },
    ],
    metrics: [
      { label: "Levels", value: "12" },
      { label: "Spacing", value: "~1.1%" },
      { label: "Pause DD", value: "6%" },
      { label: "Agent", value: g?.name || job.agentName },
    ],
    disclaimer:
      "Simulated strategy brief. Grid execution not submitted on-chain by Genesis.",
  };
}

function yieldDeliverable(job: HireJob, g?: GenesisAgent): HireDeliverable {
  return {
    title: "Yield route · BSC stables / majors",
    summary:
      "Ranked venues for capital with risk bands. Top suggestion balances APR vs exit liquidity, with PCS farm in the shortlist.",
    sections: [
      {
        heading: "Task received",
        body: job.task,
      },
      {
        heading: "Venue ranking (illustrative)",
        body: "1) Lending blue-chip — lower APR, high exit · 2) PCS farm / gauge — medium APR, IL risk if LP · 3) LST restake path — higher APR, smart-contract stack risk. Prefer #1+#2 barbell under medium risk.",
      },
      {
        heading: "Reallocation sketch",
        body: `Budget constraint $${job.budgetUsd}. Move in 2 txs: 60% lending, 40% PCS-related yield. Cap gas at 1.5% of move size. Re-check APR in 48h.`,
      },
      {
        heading: "PancakeSwap angle",
        body: "Where LP yield wins on risk-adjusted basis, use PCS pools with deep liquidity. Avoid illiquid farms even if headline APR is higher.",
      },
    ],
    metrics: [
      { label: "Top band APR", value: "7–14% (risk-adj.)" },
      { label: "Suggested split", value: "60/40" },
      { label: "Re-check", value: "48h" },
      { label: "Agent", value: g?.name || job.agentName },
    ],
    disclaimer:
      "Simulated yield brief. APRs change; verify live before moving capital.",
  };
}

function healthDeliverable(job: HireJob, g?: GenesisAgent): HireDeliverable {
  return {
    title: "Health factor protection plan",
    summary:
      "Simulated HF under collateral shocks with clear repay vs add-collateral options and alert thresholds.",
    sections: [
      {
        heading: "Task received",
        body: job.task,
      },
      {
        heading: "Baseline (illustrative)",
        body: "Assumed HF ≈ 1.45 on a Venus-style market. Liquidation threshold proximity: moderate. Soft alert at 1.30, hard alert at 1.20.",
      },
      {
        heading: "Shock table",
        body: "Collateral −10% → HF ~1.28 · −15% → HF ~1.18 · −20% → HF ~1.08. Borrow asset +10% volatility worsens distance to liquidation.",
      },
      {
        heading: "Actions",
        body: "Prefer partial repay if inventory is liquid; else add collateral of the strongest asset. Never wait for HF < 1.15 without a plan. Optional: bound a session key to repay-only calls.",
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
        body: "Agent produced a completion packet under the quoted budget and risk posture. Connect a live ERC-8183 seller endpoint to replace this simulation.",
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
