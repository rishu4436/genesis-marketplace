/**
 * Hire a third-party ERC-8004 seller (not By Genesis).
 * Uses their A2A negotiate + operator REST. Never wraps a Genesis plan.
 */

import type { HireDeliverable, HireJob } from "./hire-engine";
import type { ThirdPartySeller } from "./third-party-sellers";
import { a2aRpcUrl } from "./third-party-sellers";

const FETCH_MS = 5_000;

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
  negotiationHash?: string;
  providerSig?: string;
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

async function getJson(
  url: string,
): Promise<{ ok: boolean; data: unknown; error?: string }> {
  try {
    const res = await fetch(url, {
      signal: abortMs(FETCH_MS),
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

export async function negotiateThirdParty(
  seller: ThirdPartySeller,
  task: string,
): Promise<ThirdPartyQuote> {
  const rpcUrl = a2aRpcUrl(seller.a2aCardUrl);
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
              task_description: task,
              terms: {
                deliverables: "structured range report",
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
      result?: { parts?: { data?: Record<string, unknown> }[] };
    } | null;
    if (!res.ok) {
      return { accepted: false, error: `A2A HTTP ${res.status}` };
    }
    if (raw?.error?.message) {
      return { accepted: false, error: raw.error.message };
    }
    const data = raw?.result?.parts?.[0]?.data || {};
    const response = (data.response || {}) as Record<string, unknown>;
    const terms = (response.terms || {}) as Record<string, unknown>;
    const accepted = response.accepted !== false && Boolean(data.provider_sig);
    return {
      accepted,
      price: terms.price != null ? String(terms.price) : undefined,
      currency: terms.currency != null ? String(terms.currency) : undefined,
      negotiationHash:
        data.negotiation_hash != null
          ? String(data.negotiation_hash)
          : undefined,
      providerSig:
        data.provider_sig != null ? String(data.provider_sig) : undefined,
      quoteExpiresAt:
        typeof response.quote_expires_at === "number"
          ? response.quote_expires_at
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

export function buildThirdPartyDeliverable(opts: {
  seller: ThirdPartySeller;
  task: string;
  quote: ThirdPartyQuote;
  report: OperatorReport;
}): HireDeliverable {
  const { seller, task, quote, report } = opts;
  const st = report.status || {};
  const strat = report.strategy || {};
  const perf = report.performance || {};
  const params = (strat.parameters || {}) as Record<string, unknown>;
  const target = (strat.target_range_if_rebalanced_now || {}) as Record<
    string,
    unknown
  >;

  const inRange = st.in_range === true;
  const pair = String(st.pair || params.pair || "BNB/USDT");
  const mid = st.current_price;
  const lower = st.lower_price;
  const upper = st.upper_price;
  const apr = st.apr;
  const tvl = st.tvl;
  const util = st.range_utilization;

  const sections: { heading: string; body: string }[] = [
    {
      heading: "Seller identity",
      body: `${seller.name} is an indexed ERC-8004 agent on BSC (token #${seller.tokenId}), not operated by Genesis. Owner ${seller.ownerAddress || "—"}. A2A card: ${seller.a2aCardUrl}. This deliverable is their live operator report plus their signed hire quote.`,
    },
    {
      heading: "Live negotiate",
      body: quote.accepted
        ? `Seller accepted the brief. Signed quote ${priceHint(quote.price)} units. Negotiation hash ${quote.negotiationHash || "—"}. Provider sig ${quote.providerSig ? `${quote.providerSig.slice(0, 18)}…` : "—"}. On-chain fund + notify_funded is how they deliver the escrowed ERC-8183 job; the operator report below is their live marketplace payload.`
        : `A2A negotiate did not complete (${quote.error || "no quote"}). Operator report below is still from their public API, not a Genesis specialist.`,
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
  } else {
    sections.push({
      heading: "Operator API",
      body: `Could not load ${seller.restBase || "operator API"} (${report.error || "unreachable"}).`,
    });
  }

  sections.push({
    heading: "Your brief",
    body: task,
  });
  sections.push({
    heading: "What this is not",
    body: "This is not a By Genesis RangeKeeper plan. Genesis only routed the hire. Escrow settlement on their ERC-8183 quote is a separate on-chain step.",
  });

  return {
    title: `Live hire · ${seller.name} · ${pair}`,
    summary: report.ok
      ? `${seller.name} is ${inRange ? "in range" : "out of range"} on ${pair} at ${num(mid)}. Band ${num(lower)}–${num(upper)}. APR ~${num(apr, 2)}%. Quote ${quote.accepted ? "accepted" : "not accepted"}.`
      : `${seller.name} hire attempted. ${quote.accepted ? "Signed quote received." : `Negotiate: ${quote.error || "failed"}.`} Operator report unavailable.`,
    sections,
    metrics: [
      { label: "Seller", value: seller.name },
      { label: "ERC-8004", value: `#${seller.tokenId}` },
      { label: "In range", value: report.ok ? (inRange ? "yes" : "no") : "—" },
      { label: "Mid", value: num(mid) },
      { label: "APR", value: report.ok ? `${num(apr, 2)}%` : "—" },
      {
        label: "Quote",
        value: quote.accepted ? String(priceHint(quote.price)) : "none",
      },
    ],
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
  deliverable: HireDeliverable;
  live: boolean;
}> {
  const [quote, report] = await Promise.all([
    negotiateThirdParty(seller, task),
    fetchOperatorReport(seller),
  ]);
  return {
    quote,
    report,
    deliverable: buildThirdPartyDeliverable({ seller, task, quote, report }),
    live: quote.accepted || report.ok,
  };
}
