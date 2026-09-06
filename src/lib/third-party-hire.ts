/**
 * Hire a third-party ERC-8004 seller (not By Genesis).
 * Uses their A2A negotiate + operator REST or public measured sample.
 * Never wraps a Genesis plan.
 */

import type { HireDeliverable } from "./hire-engine";
import type { ThirdPartySeller } from "./third-party-sellers";
import { sellerRpcUrl } from "./third-party-sellers";

const FETCH_MS = 5_000;
const SAMPLE_MS = 18_000;

function abortMs(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

export type ThirdPartyQuote = {
  accepted: boolean;
  price?: string;
  currency?: string;
  priceDisplay?: string;
  negotiationHash?: string;
  providerSig?: string;
  provider?: string;
  service?: string;
  instructions?: string;
  quoteExpiresAt?: number;
  error?: string;
};

export type OperatorReport = {
  ok: boolean;
  status?: Record<string, unknown>;
  strategy?: Record<string, unknown>;
  performance?: Record<string, unknown>;
  error?: string;
};

export type SkillSample = {
  ok: boolean;
  source: "public-sample" | "none";
  heading?: string;
  body?: string;
  producedAt?: string;
  cached?: boolean;
  error?: string;
};

async function getJson(
  url: string,
  ms = FETCH_MS,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  try {
    const res = await fetch(url, {
      signal: abortMs(ms),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, data, error: `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: e instanceof Error ? e.message : "fetch failed",
    };
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function unwrapParts(parts: unknown): Record<string, unknown> | null {
  if (!Array.isArray(parts) || !parts[0]) return null;
  const p0 = asRecord(parts[0]);
  const data = asRecord(p0?.data);
  if (!data) return null;
  const response = asRecord(data.response);
  return { ...data, ...(response || {}) };
}

/** Brain returns a flat quote; LP rebalancer nests it in A2A parts. */
function unwrapA2a(raw: unknown): Record<string, unknown> {
  const root = asRecord(raw);
  const result = asRecord(root?.result) || {};
  const fromParts = unwrapParts(result.parts);
  if (fromParts) return fromParts;
  const artifacts = result.artifacts;
  if (Array.isArray(artifacts) && artifacts[0]) {
    const a0 = asRecord(artifacts[0]);
    const fromArt = unwrapParts(a0?.parts);
    if (fromArt) return fromArt;
  }
  return result;
}

export async function negotiateThirdParty(
  seller: ThirdPartySeller,
  task: string,
): Promise<ThirdPartyQuote> {
  const rpcUrl = sellerRpcUrl(seller);
  const body = {
    jsonrpc: "2.0",
    id: `neg-${Date.now()}`,
    method: "message/send",
    params: {
      message: {
        messageId: crypto.randomUUID(),
        role: "user",
        parts: [
          {
            kind: "data",
            data: {
              skill: "negotiate",
              service: seller.skillId,
              task_description: task,
              terms: {
                deliverables: seller.skillId
                  ? `${seller.skillId} measured plan`
                  : "structured range report",
                quality_standards: "marketplace hire",
              },
            },
          },
        ],
      },
    },
  };

  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: abortMs(8_000),
      cache: "no-store",
    });
    const raw = (await res.json().catch(() => null)) as {
      error?: { message?: string };
      result?: unknown;
    } | null;
    if (!res.ok) {
      return { accepted: false, error: `A2A HTTP ${res.status}` };
    }
    if (raw?.error?.message) {
      return { accepted: false, error: raw.error.message };
    }
    const data = unwrapA2a(raw);
    const accepted =
      data.accepted === true ||
      (data.accepted !== false &&
        Boolean(data.provider_sig || data.price || data.provider));
    return {
      accepted,
      price: data.price != null ? String(data.price) : undefined,
      currency: data.currency != null ? String(data.currency) : undefined,
      priceDisplay:
        data.price_display != null ? String(data.price_display) : undefined,
      negotiationHash:
        data.negotiation_hash != null
          ? String(data.negotiation_hash)
          : undefined,
      providerSig:
        data.provider_sig != null ? String(data.provider_sig) : undefined,
      provider: data.provider != null ? String(data.provider) : undefined,
      service: data.service != null ? String(data.service) : seller.skillId,
      instructions:
        data.instructions != null ? String(data.instructions) : undefined,
      quoteExpiresAt:
        typeof data.quote_expires_at === "number"
          ? data.quote_expires_at
          : undefined,
      error: accepted ? undefined : "Seller did not accept",
    };
  } catch (e) {
    return {
      accepted: false,
      error: e instanceof Error ? e.message : "A2A negotiate failed",
    };
  }
}

export async function fetchOperatorReport(
  seller: ThirdPartySeller,
): Promise<OperatorReport> {
  if (!seller.restBase) return { ok: false, error: "No operator API" };
  const base = seller.restBase.replace(/\/$/, "");
  const [status, strategy, performance] = await Promise.all([
    getJson(`${base}/status`),
    getJson(`${base}/strategy`),
    getJson(`${base}/performance`),
  ]);
  if (!status.ok && !strategy.ok) {
    return { ok: false, error: status.error || strategy.error || "no report" };
  }
  return {
    ok: true,
    status: (status.data || undefined) as Record<string, unknown> | undefined,
    strategy: (strategy.data || undefined) as Record<string, unknown> | undefined,
    performance: (performance.data || undefined) as
      | Record<string, unknown>
      | undefined,
  };
}

function num(v: unknown, digits = 4): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 100) return v.toFixed(2);
  if (Math.abs(v) >= 1) return v.toFixed(digits);
  return v.toPrecision(4);
}

function priceHint(raw?: string): number {
  if (!raw) return 0;
  try {
    const n = BigInt(raw);
    return Number(n) / 1e18;
  } catch {
    const x = Number(raw);
    return Number.isFinite(x) ? x : 0;
  }
}

function money(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}m`;
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`;
  return `$${n.toFixed(2)}`;
}

function formatSkillSample(data: unknown): { heading: string; body: string } {
  const root = asRecord(data) || {};
  const result = asRecord(root.result) || root;
  const plan = asRecord(result.plan) || result;
  const lines: string[] = [];

  const verdict =
    plan.verdict != null
      ? String(plan.verdict)
      : result.verdict != null
        ? String(result.verdict)
        : "";
  if (verdict) lines.push(verdict);

  const ranked = Array.isArray(plan.ranked) ? plan.ranked : [];
  if (ranked.length) {
    lines.push("");
    lines.push("Live Venus ranking (their measurement, not ours):");
    for (let i = 0; i < Math.min(ranked.length, 10); i++) {
      const row = asRecord(ranked[i]);
      if (!row) continue;
      lines.push(
        `#${i + 1} ${String(row.symbol || "market")} supply APY ${num(row.supply_apy_pct, 4)}% · available ${money(row.available_liquidity_usd)} · supplied ${money(row.total_supplied_usd)}`,
      );
    }
  }

  const bt = asRecord(plan.measured_block_time);
  if (bt) {
    lines.push("");
    lines.push(
      `Measured block time ${num(bt.seconds_per_block, 4)}s · ${Math.round(Number(bt.blocks_per_year) || 0).toLocaleString()} blocks/year. Using the old 10,512,000 (3s) constant understates these rates ~6.7x.`,
    );
  }

  const hf =
    plan.health_factor ??
    plan.healthFactor ??
    result.health_factor ??
    result.healthFactor;
  if (hf != null) {
    lines.push(`Health factor ${num(hf, 4)}.`);
    const borrowed = plan.borrowed_usd ?? plan.borrowed ?? result.borrowed_usd;
    const collat =
      plan.collateral_usd ?? plan.collateral ?? result.collateral_usd;
    if (borrowed != null) lines.push(`Borrowed ${money(borrowed)}.`);
    if (collat != null) lines.push(`Collateral ${money(collat)}.`);
  }

  const spacing = plan.grid_spacing_pct ?? plan.spacing_pct ?? result.spacing;
  if (spacing != null) {
    lines.push(`Grid spacing ${num(spacing, 2)}%.`);
  }
  const rtc =
    plan.round_trip_cost_pct ??
    plan.round_trip_pct ??
    result.round_trip_cost_pct;
  if (rtc != null) {
    lines.push(`Round-trip cost per cycle ${num(rtc, 2)}%.`);
  }

  if (lines.length < 2) {
    const blob = JSON.stringify(plan, null, 2);
    lines.push(blob.length > 2400 ? `${blob.slice(0, 2400)}…` : blob);
  }

  const produced =
    root.produced_at != null
      ? String(root.produced_at)
      : plan.measured_at != null
        ? String(plan.measured_at)
        : "";
  if (produced) lines.push("", `Produced ${produced}.`);
  if (root.cached === true) {
    lines.push("Operator marked this sample cached — same code as a funded job.");
  }
  lines.push(
    "",
    "This is their public measured sample, not an escrowed ERC-8183 delivery. Genesis did not write these figures.",
  );

  return {
    heading: "Their measured result (public sample)",
    body: lines.filter(Boolean).join("\n"),
  };
}

export async function fetchSkillSample(
  seller: ThirdPartySeller,
): Promise<SkillSample> {
  if (!seller.exampleUrl) {
    return { ok: false, source: "none", error: "No public sample URL" };
  }
  const got = await getJson(seller.exampleUrl, SAMPLE_MS);
  if (!got.ok || !got.data) {
    return {
      ok: false,
      source: "none",
      error: got.error || "sample unreachable",
    };
  }
  const formatted = formatSkillSample(got.data);
  const root = asRecord(got.data);
  return {
    ok: true,
    source: "public-sample",
    heading: formatted.heading,
    body: formatted.body,
    producedAt:
      root?.produced_at != null ? String(root.produced_at) : undefined,
    cached: root?.cached === true,
  };
}

export function buildThirdPartyDeliverable(opts: {
  seller: ThirdPartySeller;
  task: string;
  quote: ThirdPartyQuote;
  report: OperatorReport;
  sample?: SkillSample;
}): HireDeliverable {
  const { seller, task, quote, report, sample } = opts;
  const st = report.status || {};
  const strat = report.strategy || {};
  const perf = report.performance || {};
  const params = (strat.parameters || {}) as Record<string, unknown>;
  const target = (strat.target_range_if_rebalanced_now || {}) as Record<
    string,
    unknown
  >;

  const inRange = st.in_range === true;
  const pair = String(st.pair || params.pair || seller.skillId || "BSC");
  const mid = st.current_price;
  const lower = st.lower_price;
  const upper = st.upper_price;
  const apr = st.apr;
  const tvl = st.tvl;
  const util = st.range_utilization;
  const quoteLabel = quote.priceDisplay
    ? quote.priceDisplay
    : quote.price
      ? String(priceHint(quote.price))
      : "none";

  const sections: { heading: string; body: string }[] = [
    {
      heading: "Seller identity",
      body: `${seller.name} is an indexed ERC-8004 agent on BSC (token #${seller.tokenId}), not operated by Genesis. Owner ${seller.ownerAddress || quote.provider || "—"}. A2A card: ${seller.a2aCardUrl}. JSON-RPC: ${seller.rpcUrl || sellerRpcUrl(seller)}. This deliverable is their live quote${report.ok ? " plus their operator report" : sample?.ok ? " plus their public measured sample" : ""}.`,
    },
    {
      heading: "Live negotiate",
      body: quote.accepted
        ? `Seller accepted the brief${quote.service ? ` as ${quote.service}` : ""}. Quote ${quoteLabel}. ${quote.negotiationHash ? `Negotiation hash ${quote.negotiationHash}. ` : ""}${quote.providerSig ? `Provider sig ${quote.providerSig.slice(0, 18)}…. ` : ""}${quote.provider ? `Provider ${quote.provider}. ` : ""}${quote.instructions ? `Escrowed delivery: ${quote.instructions}` : "On-chain fund + notify_funded is how they deliver the escrowed ERC-8183 job."}`
        : `A2A negotiate did not complete (${quote.error || "no quote"}). Payload below is still from this seller, not a Genesis specialist.`,
    },
  ];

  if (report.ok) {
    sections.push({
      heading: "Live position (operator API)",
      body: `${pair} on ${st.network || "BSC"}. Status ${st.status || "—"}. In range: ${inRange ? "yes" : "no"} (${st.rebalance_reason || "—"}). Mid ${num(mid)} · band ${num(lower)}–${num(upper)} · utilization ${num(util, 2)}%. TVL ~$${num(tvl)} · fee APR ~${num(apr, 2)}%. Last check ${st.last_check || "—"}.`,
    });
    sections.push({
      heading: "Strategy (their parameters)",
      body: `Range ${num(params.range_pct, 2)}% · trigger ${num(params.trigger_pct, 2)}% · fee tier ${params.fee ?? "—"} · NFT #${params.token_id ?? st.token_id ?? "—"}. If rebalanced now they would set ${num(target.lower_price)}–${num(target.upper_price)}.`,
    });
    sections.push({
      heading: "Performance (their ledger)",
      body: `Rebalances ${perf.rebalance_count ?? st.rebalance_count ?? "—"} · last ${perf.last_rebalance || st.last_rebalance || "—"}. Fees 24h ~$${num(perf.fees_24h_usdt ?? st.fees_24h)}. PnL ~$${num(perf.pnl_usdt ?? st.pnl)}. Gas spent ~$${num(perf.gas_spent_usdt ?? st.gas_cost)}.`,
    });
  } else if (seller.restBase) {
    sections.push({
      heading: "Operator API",
      body: `Could not load ${seller.restBase} (${report.error || "unreachable"}).`,
    });
  }

  if (sample?.ok && sample.body) {
    sections.push({
      heading: sample.heading || "Their measured result (public sample)",
      body: sample.body,
    });
  } else if (seller.exampleUrl && sample && !sample.ok) {
    sections.push({
      heading: "Public sample",
      body: `Could not load ${seller.exampleUrl} (${sample.error || "unreachable"}). Signed quote above still belongs to this seller. Escrowed delivery needs their ERC-8183 notify_funded — Genesis does not impersonate them.`,
    });
  }

  sections.push({
    heading: "Your brief",
    body: task,
  });
  sections.push({
    heading: "What this is not",
    body: "This is not a By Genesis specialist plan. Genesis only routed the hire. Escrow settlement on their ERC-8183 quote is a separate on-chain step. We do not move funds.",
  });

  const metrics: { label: string; value: string }[] = [
    { label: "Seller", value: seller.name },
    { label: "ERC-8004", value: `#${seller.tokenId}` },
    {
      label: "Quote",
      value: quote.accepted ? quoteLabel : "none",
    },
  ];
  if (report.ok) {
    metrics.push(
      { label: "In range", value: inRange ? "yes" : "no" },
      { label: "Mid", value: num(mid) },
      { label: "APR", value: `${num(apr, 2)}%` },
    );
  } else if (sample?.ok) {
    metrics.push({
      label: "Payload",
      value: sample.cached ? "cached sample" : "public sample",
    });
  }

  const summary = report.ok
    ? `${seller.name} is ${inRange ? "in range" : "out of range"} on ${pair} at ${num(mid)}. Band ${num(lower)}–${num(upper)}. APR ~${num(apr, 2)}%. Quote ${quote.accepted ? "accepted" : "not accepted"}.`
    : sample?.ok
      ? `${seller.name} accepted a ${quoteLabel} quote. Below is their public measured sample (same code as a funded job; not escrowed).`
      : `${seller.name} hire attempted. ${quote.accepted ? "Signed quote received." : `Negotiate: ${quote.error || "failed"}.`} Live payload unavailable.`;

  return {
    title: `Live hire · ${seller.name}${report.ok ? ` · ${pair}` : ""}`,
    summary,
    sections,
    metrics,
    disclaimer:
      "Third-party seller. Genesis did not produce this analysis. Not financial advice. No funds moved by Genesis.",
  };
}

export function identityOnlyDeliverable(opts: {
  agentName: string;
  chainId: number;
  tokenId: string;
  task: string;
}): HireDeliverable {
  return {
    title: `Indexed identity · ${opts.agentName}`,
    summary: `${opts.agentName} is registered on ERC-8004 (BSC #${opts.tokenId}) but has no live hire endpoint Genesis can complete. We did not generate a specialist plan under their name.`,
    sections: [
      {
        heading: "What we verified",
        body: `On-chain identity: chain ${opts.chainId} · token #${opts.tokenId}. Listed in the 8004scan index. No reachable A2A negotiate or operator API on this hire.`,
      },
      {
        heading: "Your brief (not fulfilled by this seller)",
        body: opts.task,
      },
      {
        heading: "Hire-ready alternative",
        body: "For a completed rebalance / grid / yield / health plan, buy a By Genesis specialist. They are operated by this marketplace and return a structured deliverable in minutes.",
      },
    ],
    metrics: [
      { label: "Seller", value: opts.agentName },
      { label: "ERC-8004", value: `#${opts.tokenId}` },
      { label: "Hire", value: "identity only" },
    ],
    disclaimer:
      "Indexed listing, not a live hire. Genesis did not impersonate this agent.",
  };
}

export async function runThirdPartyHire(
  seller: ThirdPartySeller,
  task: string,
): Promise<{
  quote: ThirdPartyQuote;
  report: OperatorReport;
  sample: SkillSample;
  deliverable: HireDeliverable;
  live: boolean;
}> {
  const quotePromise = negotiateThirdParty(seller, task);
  const reportPromise = seller.restBase
    ? fetchOperatorReport(seller)
    : Promise.resolve<OperatorReport>({
        ok: false,
        error: "No operator API",
      });
  const samplePromise = seller.exampleUrl
    ? fetchSkillSample(seller)
    : Promise.resolve<SkillSample>({ ok: false, source: "none" });

  const [quote, report, sample] = await Promise.all([
    quotePromise,
    reportPromise,
    samplePromise,
  ]);
  return {
    quote,
    report,
    sample,
    deliverable: buildThirdPartyDeliverable({
      seller,
      task,
      quote,
      report,
      sample,
    }),
    live: report.ok || sample.ok,
  };
}
