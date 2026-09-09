import type { CategoryId } from "./categories";
import { getGenesisAgent, type GenesisAgent } from "./genesis-agents";
import type { HireIntent } from "./hire";
import {
  negotiateLive,
  priceToUsdHint,
} from "./erc8183-client";
import {
  a2aNegotiate,
  getPlatformConfig,
  isPlatformDown,
  markPlatformDown,
} from "./platform-a2a";
import { buildExpertDeliverable } from "./agent-specialists";
import type { CommerceTier } from "./agent-model";
import type { BuyerContext } from "./buyer-context";
import type { DemoPayment } from "./demo-pay";
import { buildFullReport, buildFreeScan } from "./report-engine";
import {
  getFeaturedByToken,
  sellerFromAgent,
} from "./third-party-sellers";
import {
  identityOnlyDeliverable,
  runThirdPartyHire,
} from "./third-party-hire";
import { getAgentSafe } from "./scan";
import { BSC_MAINNET_CHAIN_ID, isTestnetIdentity } from "./pins";
import type { JobReceipt, JobSpec } from "./job-spec";
import type { JobDecision } from "./job-decision";
import {
  closeSession,
  grantPlanSession,
  type IsolationRecord,
  type JobSession,
} from "./job-session";
import { runIsolated } from "./job-isolation";
import { parseDocumentedListU } from "./listing-price";

export type HireStatus =
  | "negotiating"
  | "quoted"
  | "funded"
  | "fulfilling"
  | "delivered"
  | "failed";

export type EscrowRecord = {
  protocol: "ERC-8183";
  chainId: 56;
  onchainJobId: string;
  token: `0x${string}`;
  tokenSymbol: "U";
  amountWei: string;
  amountU: string;
  buyer: `0x${string}`;
  /** Seller identity / escrow counterparty — never a tip address. */
  provider: `0x${string}`;
  commerce: `0x${string}`;
  router: `0x${string}`;
  policy: `0x${string}`;
  createTx?: `0x${string}`;
  fundTx?: `0x${string}`;
  approveTx?: `0x${string}`;
  submitTx?: `0x${string}`;
  settleTx?: `0x${string}`;
  disputeTx?: `0x${string}`;
  chainStatus?: string;
  submittedAt?: number;
  disputeWindowSeconds?: number;
  expiredAt?: number;
};

export type HireQuote = {
  priceUsd: number;
  /** Catalog list SKU — labeling only on Get plan; may differ from quoted. */
  listSkuUsd?: number;
  currency: string;
  etaMinutes: number;
  protocol: "ERC-8183" | "ERC-8183-sim" | "ERC-8183-live" | "x402-free";
  expiresAt: string;
  notes: string;
  providerSig?: string;
  rawPrice?: string;
  live?: boolean;
  tier?: CommerceTier;
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
  /** Short code so a buyer can open this hire on another device */
  claimCode?: string;
  /** Signed-in buyer who owns this hire */
  ownerId?: string;
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
  /** holdout jobs are shadow-book evidence, never buyer commerce */
  purpose?: "hire" | "holdout";
  /** free | full | escrow — stockanalyst-inspired */
  tier?: CommerceTier;
  buyerContext?: BuyerContext | null;
  quote?: HireQuote;
  payment?: DemoPayment;
  /** On-chain ERC-8183 lock. Absent on soft hire. */
  escrow?: EscrowRecord;
  deliverable?: HireDeliverable;
  timeline: { at: string; status: HireStatus; detail: string }[];
  serviceUrl?: string;
  /** Canonical request — hashed into the receipt */
  spec?: JobSpec;
  /** Evidence seal — verify on read, do not trust the client */
  receipt?: JobReceipt;
  /** Plan-only session — never a master key */
  session?: JobSession;
  isolation?: IsolationRecord;
  /** Buyer accept / dispute — plan quality, not a payout */
  decision?: JobDecision;
};

function nowIso() {
  return new Date().toISOString();
}

function jobId() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const CLAIM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeClaimCode(): string {
  let raw = "";
  for (let i = 0; i < 6; i++) {
    raw += CLAIM_ALPHABET[Math.floor(Math.random() * CLAIM_ALPHABET.length)];
  }
  return `GX-${raw.slice(0, 3)}-${raw.slice(3)}`;
}

export function normalizeClaimCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function attachSession(job: HireJob): HireJob {
  if (job.session) return job;
  return {
    ...job,
    session: grantPlanSession({
      jobId: job.id,
      chainId: job.chainId,
      tokenId: job.tokenId,
      genesisSlug: job.genesisSlug,
      categoryId: job.categoryId,
    }),
  };
}

function settleSession(
  job: HireJob,
  status: "consumed" | "revoked" | "killed" | "expired",
  reason: string,
): HireJob {
  if (!job.session) return job;
  return { ...job, session: closeSession(job.session, status, reason) };
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

  const priceUsd = Math.round(price * 100) / 100;
  return {
    priceUsd,
    listSkuUsd: g?.basePriceUsd ?? priceUsd,
    currency: "USD",
    etaMinutes: eta,
    protocol: "ERC-8183-sim",
    expiresAt: expires,
    notes: g
      ? `Soft-hire quote for ${g.name} — no payment, no on-chain lock (ERC-8183-sim).`
      : `Soft-hire quote for ${intent.agentName || "agent"} — no payment, no on-chain lock (ERC-8183-sim).`,
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
    claimCode: makeClaimCode(),
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
  job = attachSession(job);

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
  tier?: CommerceTier;
  buyerContext?: BuyerContext | null;
}): Promise<HireJob> {
  const g = input.genesisSlug
    ? getGenesisAgent(input.genesisSlug)
    : undefined;
  const serviceUrl = g?.serviceUrl;
  const chainId = g ? BSC_MAINNET_CHAIN_ID : Number(input.chainId || BSC_MAINNET_CHAIN_ID);
  const tokenId = g
    ? g.tokenId && !isTestnetIdentity(chainId, g.tokenId)
      ? g.tokenId
      : `genesis:${g.slug}`
    : String(input.tokenId);

  const tier: CommerceTier = input.tier || "full";
  const id = jobId();
  const createdAt = nowIso();
  let job: HireJob = {
    id,
    claimCode: makeClaimCode(),
    createdAt,
    updatedAt: createdAt,
    status: "negotiating",
    chainId,
    tokenId,
    agentName: input.agentName,
    genesisSlug: input.genesisSlug,
    categoryId: input.categoryId,
    task: input.task,
    budgetUsd: input.budgetUsd,
    duration: input.duration,
    risk: input.risk,
    notes: input.notes,
    tier,
    buyerContext: input.buyerContext ?? null,
    serviceUrl,
    timeline: [],
  };
  job = attachSession(job);

  // ── Free scan — Genesis specialists still get the full job-specific plan ──
  if (tier === "free" && input.genesisSlug) {
    job = pushTimeline(
      job,
      "negotiating",
      `Specialist plan · ${input.agentName}`,
    );
    job = {
      ...job,
      quote: {
        priceUsd: 0,
        currency: "USD",
        etaMinutes: g?.etaMinutes ?? 2,
        protocol: "x402-free",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        notes: "Soft hire · full specialist plan · no custody",
        tier: "full",
        live: false,
      },
    };
    return fulfillJobAsync({ ...job, status: "quoted", tier: "full" });
  }

  if (tier === "free") {
    job = pushTimeline(job, "negotiating", "Free scan · multi-source spot check");
    const scan = await buildFreeScan({
      task: input.task,
      categoryId: input.categoryId,
      agentName: input.agentName,
      risk: input.risk,
    });
    job = {
      ...pushTimeline(job, "delivered", "Free scan ready — upgrade to Full for plan"),
      quote: {
        priceUsd: 0,
        currency: "USD",
        etaMinutes: 0,
        protocol: "x402-free",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        notes: "Free scan · 0 U · identity of request only",
        tier: "free",
        live: false,
      },
      deliverable: {
        title: scan.title,
        summary: scan.summary,
        sections: [
          {
            heading: "Recommendation",
            body: scan.recommendation,
          },
          {
            heading: "Sources",
            body: scan.sources.join("\n") || "—",
          },
          {
            heading: "Upgrade",
            body: "Run Full analysis for bull/bear thesis, execution checklist, and buyer-context notes.",
          },
        ],
        metrics: scan.metrics,
        disclaimer: scan.disclaimer,
      },
    };
    return settleSession(job, "consumed", "free scan delivered · session revoked");
  }

  job = pushTimeline(
    job,
    "negotiating",
    tier === "escrow"
      ? "Escrow tier · full analysis + on-chain path note"
      : input.genesisSlug
        ? `Specialist negotiate · ${input.agentName}`
        : `Third-party hire · ${input.agentName}`,
  );

  // Platform A2A path (BNB managed trial agents) — bounded, silent fallback
  const platformCfg = input.genesisSlug
    ? getPlatformConfig(input.genesisSlug)
    : null;
  const skipLive =
    !platformCfg ||
    (input.genesisSlug ? isPlatformDown(input.genesisSlug) : false);

  if (platformCfg && !skipLive) {
    const clientId =
      process.env[platformCfg.clientIdEnv] ||
      process.env.PLATFORM_CLIENT_ID;
    const clientSecret =
      process.env[platformCfg.clientSecretEnv] ||
      process.env.PLATFORM_CLIENT_SECRET;

    if (clientId && clientSecret) {
      try {
        const a2a = await a2aNegotiate({
          a2aUrl: platformCfg.a2aUrl,
          agentId: platformCfg.agentId,
          taskDescription: input.task,
          clientId,
          clientSecret,
          terms: {
            deliverables: g?.tagline || "structured brief",
            quality_standards: input.notes || "marketplace hire",
          },
        });

        if (a2a.ok) {
          const priceUsd =
            priceToUsdHint(a2a.price, a2a.price_usd) ??
            buildQuote(input).priceUsd;
          job = {
            ...pushTimeline(
              job,
              "quoted",
              `Soft-hire quote · $${priceUsd} · ${g?.name || input.agentName} · ERC-8183-sim`,
            ),
            quote: {
              priceUsd,
              listSkuUsd: g?.basePriceUsd ?? priceUsd,
              currency: a2a.currency || "USD-sim",
              etaMinutes: g?.etaMinutes ?? 2,
              protocol: "ERC-8183-sim",
              expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              notes: `Soft-hire quote from ${g?.name || input.genesisSlug} — no on-chain lock`,
              providerSig: a2a.provider_sig,
              rawPrice: a2a.price != null ? String(a2a.price) : undefined,
              live: false,
            },
          };
          if (input.autoFulfill !== false) {
            job = await fulfillJobAsync(job);
          }
          return job;
        }

        if (input.genesisSlug) markPlatformDown(input.genesisSlug);
      } catch {
        if (input.genesisSlug) markPlatformDown(input.genesisSlug);
      }
    }
  }

  // Catalog / third-party — never wear a Genesis plan
  if (!input.genesisSlug) {
    job = await fulfillCatalogHire(job, input);
    return job;
  }

  if (serviceUrl) {
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

        const isGenesisApex = serviceUrl.includes("/api/apex/");
        job = {
          ...pushTimeline(
            job,
            "quoted",
            `Negotiate OK · $${priceUsd} · ${isGenesisApex ? "Genesis APEX · ERC-8183-sim" : "external service · ERC-8183-sim"}`,
          ),
          quote: {
            priceUsd,
            listSkuUsd: g?.basePriceUsd ?? priceUsd,
            currency: isGenesisApex
              ? "USD-sim"
              : (data.currency as string) || "USD-sim",
            etaMinutes: eta as number,
            protocol: "ERC-8183-sim",
            expiresAt: expires,
            notes: isGenesisApex
              ? `Soft-hire quote for ${g?.name || "specialist"} — no payment, no on-chain lock.`
              : (data.notes as string) ||
                "Soft-hire A2A quote — no on-chain lock",
            providerSig: data.provider_sig as string | undefined,
            rawPrice: data.price != null ? String(data.price) : undefined,
            live: false,
          },
        };

        if (data.deliverable && typeof data.deliverable === "object") {
          // Prefer full multi-source report over thin embedded payload
          job = await fulfillJobAsync(job);
        } else if (input.autoFulfill !== false) {
          job = await fulfillJobAsync(job);
        }
        return job;
      }

      // live seller unavailable — specialist engine below
    } catch {
      /* specialist engine below */
    }
  }

  // Full analysis — always hireable (Studio optional)
  const quote = buildQuote({ ...input, agentName: input.agentName });
  const escrowNote =
    tier === "escrow"
      ? " Escrow tier: open /fund to attempt on-chain fund when policy allows."
      : "";
  job = {
    ...pushTimeline(
      job,
      "quoted",
      `Quoted $${quote.priceUsd} · ETA ${quote.etaMinutes}m · ${input.agentName}`,
    ),
    quote: {
      ...quote,
      tier,
      notes: `Full analysis for ${input.agentName}.${escrowNote}`,
    },
  };
  if (input.autoFulfill !== false) {
    job = await fulfillJobAsync(job);
  }
  return job;
}

async function fulfillCatalogHire(
  job: HireJob,
  input: {
    chainId: number;
    tokenId: string;
    agentName: string;
    task: string;
    autoFulfill?: boolean;
  },
): Promise<HireJob> {
  let seller = getFeaturedByToken(input.chainId, input.tokenId);

  if (!seller) {
    const fetched = await getAgentSafe(input.chainId, input.tokenId);
    if (fetched.data) seller = sellerFromAgent(fetched.data);
  }

  if (seller) {
    const result = await runThirdPartyHire(seller, input.task);
    const priceUsd = result.quote.accepted
      ? (parseDocumentedListU(result.quote.priceDisplay) ??
        priceToUsdHint(result.quote.price) ??
        0)
      : 0;
    const sellerName = seller.name || input.agentName;
    job = { ...job, agentName: sellerName };
    let next: HireJob = {
      ...pushTimeline(
        job,
        "quoted",
        result.quote.accepted
          ? `Third-party quote accepted · ${sellerName}`
          : `Third-party hire · ${sellerName}`,
      ),
      quote: {
        priceUsd,
        currency: "USD",
        etaMinutes: 1,
        protocol: "ERC-8183-sim",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        notes: result.quote.accepted
          ? `Signed quote from ${sellerName} — no Genesis on-chain lock`
          : `Live payload from ${sellerName} — no on-chain lock`,
        providerSig: result.quote.providerSig,
        live: result.live,
      } as HireQuote,
    };
    if (input.autoFulfill !== false) {
      next = {
        ...next,
        deliverable: result.deliverable,
      };
      if (result.live) {
        next = pushTimeline(
          next,
          "quoted",
          `Live sample from ${sellerName} · not Delivered (not an escrowed plan)`,
        );
        next = settleSession(
          next,
          "consumed",
          "third-party sample recorded · session revoked",
        );
      } else {
        next = pushTimeline(
          next,
          "quoted",
          result.quote.accepted
            ? `Quote only · ${sellerName} has no public payload on this rail. Delivery needs their ERC-8183 notify_funded.`
            : `No live payload from ${sellerName}`,
        );
        next = {
          ...next,
          quote: {
            ...next.quote!,
            live: false,
            notes: result.quote.accepted
              ? `Signed quote from ${sellerName} — no plan payload until they deliver on-chain.`
              : next.quote!.notes,
          },
        };
      }
    }
    return next;
  }

  const deliverable = identityOnlyDeliverable({
    agentName: input.agentName,
    chainId: input.chainId,
    tokenId: input.tokenId,
    task: input.task,
  });
  let next: HireJob = {
    ...pushTimeline(
      job,
      "quoted",
      "Indexed identity — no live hire endpoint",
    ),
    quote: {
      priceUsd: 0,
      currency: "USD",
      etaMinutes: 0,
      protocol: "ERC-8183-sim",
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      notes: "Identity only — seller has no reachable A2A/operator API",
      live: false,
    },
  };
  if (input.autoFulfill !== false) {
    next = {
      ...pushTimeline(
        next,
        "quoted",
        "Identity only · no live payload — not Delivered",
      ),
      deliverable,
    };
    next = settleSession(
      next,
      "consumed",
      "identity recorded · session revoked",
    );
  }
  return next;
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
  return settleSession(next, "consumed", "embedded plan delivered · session revoked");
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
  // Sync fallback for callers that cannot await (legacy)
  let next = attachSession(job);
  if (next.status === "quoted") {
    next = fundJob(next);
  }
  if (next.status !== "funded" && next.status !== "fulfilling") {
    return next;
  }
  next = pushTimeline(next, "fulfilling", "Agent fulfilling job…");
  const g = job.genesisSlug ? getGenesisAgent(job.genesisSlug) : undefined;
  const deliverable = buildExpertDeliverable(next, g);
  next = {
    ...pushTimeline(next, "delivered", "Deliverable ready"),
    deliverable,
  };
  return settleSession(next, "consumed", "plan delivered · session revoked");
}

/** Async fulfill — multi-source report + buyer context (v2 model) */
export async function fulfillJobAsync(job: HireJob): Promise<HireJob> {
  let next = attachSession(job);
  if (next.status === "quoted") {
    next = fundJob(next);
  }
  if (next.status !== "funded" && next.status !== "fulfilling") {
    return next;
  }
  next = pushTimeline(
    next,
    "fulfilling",
    "Isolated session · multi-source analysis + specialist plan…",
  );
  const g = job.genesisSlug ? getGenesisAgent(job.genesisSlug) : undefined;
  const session = next.session!;
  const ran = await runIsolated(session, async () => {
    const deliverable = await buildFullReport(
      next,
      g,
      next.buyerContext ?? null,
    );
    if (next.tier === "escrow" && !next.escrow?.fundTx) {
      deliverable.sections = [
        {
          heading: "On-chain escrow path",
          body: "This analysis is the plan. Optional ERC-8183 lock starts from the agent page (Hire with escrow) — not a transfer to the seller address.",
        },
        ...deliverable.sections,
      ];
    }
    return deliverable;
  });

  next = { ...next, isolation: ran.isolation };

  const deliverable =
    ran.value || buildExpertDeliverable(next, g);

  if (next.tier === "escrow" && !next.escrow?.fundTx && !ran.value) {
    deliverable.sections = [
      {
        heading: "On-chain escrow path",
        body: "Escrow is optional BSC mainnet ERC-8183 from the agent page. Soft deliverable is available now so you are never blocked.",
      },
      ...deliverable.sections,
    ];
  }

  next = {
    ...pushTimeline(
      next,
      "delivered",
      ran.value
        ? "Full analysis ready · session consumed"
        : "Fallback plan · isolated fulfill did not complete",
    ),
    deliverable,
  };
  return settleSession(
    next,
    ran.isolation.killed ? "killed" : "consumed",
    ran.isolation.killed
      ? ran.isolation.killReason || "isolated fulfill killed"
      : "plan delivered · session revoked",
  );
}
