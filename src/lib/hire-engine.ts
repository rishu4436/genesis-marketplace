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
import { buildFullReport, buildFreeScan } from "./report-engine";
import {
  FEATURED_THIRD_PARTY,
  isFeaturedThirdParty,
  sellerFromAgent,
} from "./third-party-sellers";
import {
  identityOnlyDeliverable,
  runThirdPartyHire,
} from "./third-party-hire";
import { getAgentSafe } from "./scan";

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
  /** free | full | escrow — stockanalyst-inspired */
  tier?: CommerceTier;
  buyerContext?: BuyerContext | null;
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
      ? `Soft-hire quote for ${g.name} (no payment). Live negotiate used when seller is reachable.`
      : `Soft-hire quote for ${intent.agentName || "agent"} (no payment).`,
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
  tier?: CommerceTier;
  buyerContext?: BuyerContext | null;
}): Promise<HireJob> {
  const g = input.genesisSlug
    ? getGenesisAgent(input.genesisSlug)
    : undefined;
  const serviceUrl = g?.serviceUrl;

  const tier: CommerceTier = input.tier || "full";
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
    tier,
    buyerContext: input.buyerContext ?? null,
    serviceUrl,
    timeline: [],
  };

  // ── Free scan tier (stockanalyst x402:free analogue) ──
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
    return job;
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
              `Live quote · $${priceUsd} · ${g?.name || input.agentName}`,
            ),
            quote: {
              priceUsd,
              currency: a2a.currency || "U",
              etaMinutes: g?.etaMinutes ?? 2,
              protocol: "ERC-8183-live",
              expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              notes: `Signed quote from ${g?.name || input.genesisSlug}`,
              providerSig: a2a.provider_sig,
              rawPrice: a2a.price != null ? String(a2a.price) : undefined,
              live: true,
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

  if (serviceUrl && !platformCfg) {
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
  let seller = isFeaturedThirdParty(input.chainId, input.tokenId)
    ? FEATURED_THIRD_PARTY
    : null;

  if (!seller) {
    const fetched = await getAgentSafe(input.chainId, input.tokenId);
    if (fetched.data) seller = sellerFromAgent(fetched.data);
  }

  if (seller) {
    const result = await runThirdPartyHire(seller, input.task);
    const priceUsd = result.quote.accepted ? 0.1 : 0;
    let next = {
      ...pushTimeline(
        job,
        "quoted",
        result.quote.accepted
          ? `Third-party quote accepted · ${seller.name}`
          : `Third-party hire · ${seller.name} (operator report)`,
      ),
      quote: {
        priceUsd,
        currency: "USD",
        etaMinutes: 1,
        protocol: result.quote.accepted ? "ERC-8183-live" : "ERC-8183",
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        notes: result.quote.accepted
          ? `Signed quote from ${seller.name}`
          : `Live operator report from ${seller.name}`,
        providerSig: result.quote.providerSig,
        live: result.live,
      } as HireQuote,
    };
    if (input.autoFulfill !== false) {
      next = pushTimeline(
        next,
        "funded",
        "Routed to third-party seller (no Genesis custody)",
      );
      next = pushTimeline(
        next,
        "fulfilling",
        "Fetching seller quote + operator report…",
      );
      next = {
        ...pushTimeline(
          next,
          "delivered",
          result.live
            ? `Deliverable from ${seller.name}`
            : `Indexed seller unreachable · identity recorded`,
        ),
        deliverable: result.deliverable,
      };
    }
    return next;
  }

  const deliverable = identityOnlyDeliverable({
    agentName: input.agentName,
    chainId: input.chainId,
    tokenId: input.tokenId,
    task: input.task,
  });
  let next = {
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
    } as HireQuote,
  };
  if (input.autoFulfill !== false) {
    next = {
      ...pushTimeline(
        next,
        "delivered",
        "No third-party session — did not impersonate this agent",
      ),
      deliverable,
    };
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
  // Sync fallback for callers that cannot await (legacy)
  let next = job;
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
  return next;
}

/** Async fulfill — multi-source report + buyer context (v2 model) */
export async function fulfillJobAsync(job: HireJob): Promise<HireJob> {
  let next = job;
  if (next.status === "quoted") {
    next = fundJob(next);
  }
  if (next.status !== "funded" && next.status !== "fulfilling") {
    return next;
  }
  next = pushTimeline(
    next,
    "fulfilling",
    "Multi-source analysis + specialist plan…",
  );
  const g = job.genesisSlug ? getGenesisAgent(job.genesisSlug) : undefined;
  try {
    const deliverable = await buildFullReport(
      next,
      g,
      next.buyerContext ?? null,
    );
    if (next.tier === "escrow") {
      deliverable.sections = [
        {
          heading: "On-chain escrow path",
          body: "This job was fulfilled under the Escrow tier analysis. To lock U on-chain when policy allows: open /fund, create/fund ERC-8183 job, then settle after 24h. Soft deliverable is available now so you are never blocked.",
        },
        ...deliverable.sections,
      ];
    }
    next = {
      ...pushTimeline(next, "delivered", "Full analysis ready"),
      deliverable,
    };
  } catch {
    next = fulfillJob(next);
  }
  return next;
}
