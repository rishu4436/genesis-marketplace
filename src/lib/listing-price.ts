/**
 * Browse/list price for a card.
 * SKU $ is labeling (Get plan never charges). $U is only shown when the seller
 * published a list quote — we do not stamp 0.1 $U on every live agent.
 */

import type { Agent } from "./types";
import { getGenesisAgent } from "./genesis-agents";
import { hireClassForAgent, matchingGenesisSlug } from "./hire-class";
import { getFeaturedByToken } from "./third-party-sellers";

const DOCUMENTED_U = /(\d+(?:\.\d+)?)\s*\$U\b/i;

export type ListingPrice = {
  amount: number | null;
  unit: "USD" | "U" | "quote";
  /** Compact scan text: "$8", "0.1 $U", or "quote" */
  label: string;
  /** Buy button: "Buy · $8" */
  cta: string;
};

export function parseDocumentedListU(
  ...parts: (string | undefined | null)[]
): number | null {
  const hay = parts.filter(Boolean).join(" ");
  const m = hay.match(DOCUMENTED_U);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function fmtSku(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

function fmtU(n: number): string {
  return `${Number(n)} $U`;
}

function uPrice(amount: number): ListingPrice {
  const label = fmtU(amount);
  return { amount, unit: "U", label, cta: `Buy · ${label}` };
}

export function listingPriceForAgent(agent: Agent): ListingPrice | null {
  const cls = hireClassForAgent(agent);
  if (cls === "indexed") return null;
  if (cls === "genesis") {
    const slug = matchingGenesisSlug(agent);
    const amount = slug ? getGenesisAgent(slug)?.basePriceUsd : undefined;
    if (typeof amount !== "number" || !(amount > 0)) return null;
    const label = `$${fmtSku(amount)}`;
    return { amount, unit: "USD", label, cta: `Buy · ${label}` };
  }

  const pin = getFeaturedByToken(agent.chain_id, agent.token_id);
  const fromPin =
    typeof pin?.listPriceU === "number" && pin.listPriceU > 0
      ? pin.listPriceU
      : null;
  const documented =
    fromPin ??
    parseDocumentedListU(
      pin?.tagline,
      pin?.description,
      agent.name,
      agent.description,
    );
  if (documented != null) return uPrice(documented);

  return {
    amount: null,
    unit: "quote",
    label: "quote",
    cta: "Buy · quote",
  };
}
