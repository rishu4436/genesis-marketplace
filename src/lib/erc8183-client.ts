/**
 * Minimal ERC-8183 / APEX Layer-B client.
 * Spec shape from BNB Agent Studio demo: POST {base}/negotiate
 */

export type NegotiateRequest = {
  task_description: string;
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

export type NegotiateResponse = {
  accepted?: boolean;
  price?: string | number;
  price_usd?: number;
  currency?: string;
  chain_id?: number;
  provider_sig?: string;
  quote_expires_at?: string;
  request?: NegotiateRequest;
  deliverable_preview?: string;
  error?: string;
  /** Studio often nests fields */
  [key: string]: unknown;
};

export function normalizeServiceBase(url: string): string {
  const u = url.replace(/\/$/, "");
  // Accept both .../apex and .../apex/
  return u;
}

export async function negotiateLive(
  serviceUrl: string,
  body: NegotiateRequest,
  init?: RequestInit,
): Promise<{ ok: boolean; data: NegotiateResponse; raw: string }> {
  const base = normalizeServiceBase(serviceUrl);
  const endpoint = base.endsWith("/negotiate")
    ? base
    : `${base}/negotiate`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init?.headers,
    },
    body: JSON.stringify(body),
    ...init,
    cache: "no-store",
  });

  const raw = await res.text();
  let data: NegotiateResponse = {};
  try {
    data = JSON.parse(raw) as NegotiateResponse;
  } catch {
    data = { error: raw || res.statusText };
  }

  return { ok: res.ok, data, raw };
}

/** Convert wei-like price strings to rough USD for UI when only wei given */
export function priceToUsdHint(
  price: string | number | undefined,
  priceUsd?: number,
): number | undefined {
  if (typeof priceUsd === "number" && !Number.isNaN(priceUsd)) return priceUsd;
  if (price == null) return undefined;
  const n = typeof price === "number" ? price : Number(price);
  if (!Number.isFinite(n)) return undefined;
  // If looks like wei (>= 1e15), treat as 18-decimal BNB/USD stable placeholder
  if (n >= 1e15) {
    return Math.round((n / 1e18) * 100) / 100;
  }
  return n;
}
