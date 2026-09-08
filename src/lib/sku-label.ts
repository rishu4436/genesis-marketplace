/**
 * List SKU vs quoted amount. SKU $ is labeling; Get plan never charges.
 */

import type { HireJob } from "./hire-engine";
import { getGenesisAgent } from "./genesis-agents";

export function listVsQuoted(job: HireJob): {
  listUsd: number | null;
  quotedUsd: number | null;
} {
  const quoted =
    typeof job.quote?.priceUsd === "number" ? job.quote.priceUsd : null;
  const listed =
    typeof job.quote?.listSkuUsd === "number"
      ? job.quote.listSkuUsd
      : job.genesisSlug
        ? (getGenesisAgent(job.genesisSlug)?.basePriceUsd ?? quoted)
        : quoted;
  return { listUsd: listed ?? null, quotedUsd: quoted };
}

export function skuQuotedLine(job: HireJob): string {
  const { listUsd, quotedUsd } = listVsQuoted(job);
  const locked = Boolean(job.escrow?.fundTx);
  const pay = locked
    ? `${job.escrow?.amountU || ""} $U locked`.trim()
    : "plan · no charge";
  if (
    listUsd != null &&
    quotedUsd != null &&
    Math.abs(listUsd - quotedUsd) > 0.001
  ) {
    return `$${fmt(listUsd)} list / $${fmt(quotedUsd)} quoted · ${pay}`;
  }
  if (quotedUsd != null) return `SKU $${fmt(quotedUsd)} · ${pay}`;
  if (listUsd != null) return `SKU $${fmt(listUsd)} · ${pay}`;
  return pay;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}
