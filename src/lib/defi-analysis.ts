/**
 * Multi-source DeFi analysis layer — stockanalyst-inspired.
 * Pulls public market snapshots when possible; always returns labeled sources.
 */

import { jobFetch } from "./job-isolation";

export type AnalysisSource = {
  id: string;
  name: string;
  status: "live" | "derived" | "unavailable";
  detail: string;
};

export type MarketSnapshot = {
  symbol: string;
  priceUsd?: number;
  change24hPct?: number;
  sources: AnalysisSource[];
  fetchedAt: string;
};

const COINGECKO_IDS: Record<string, string> = {
  BNB: "binancecoin",
  WBNB: "wbnb",
  CAKE: "pancakeswap-token",
  ETH: "ethereum",
  BTC: "bitcoin",
  USDT: "tether",
  USDC: "usd-coin",
};

export async function fetchMarketSnapshot(
  tickers: string[],
): Promise<MarketSnapshot[]> {
  const unique = [...new Set(tickers.map((t) => t.toUpperCase()))].filter(
    (t) => COINGECKO_IDS[t],
  );
  const fetchedAt = new Date().toISOString();
  if (unique.length === 0) {
    return tickers.map((symbol) => ({
      symbol,
      sources: [
        {
          id: "coingecko",
          name: "CoinGecko",
          status: "unavailable",
          detail: "No mapped id for symbol",
        },
      ],
      fetchedAt,
    }));
  }

  const ids = unique.map((t) => COINGECKO_IDS[t]).join(",");
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const res = await jobFetch(url, {
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
      signal:
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(2500)
          : undefined,
    });
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const json = (await res.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number }
    >;

    return unique.map((symbol) => {
      const id = COINGECKO_IDS[symbol];
      const row = json[id];
      return {
        symbol,
        priceUsd: row?.usd,
        change24hPct:
          row?.usd_24h_change != null
            ? Math.round(row.usd_24h_change * 100) / 100
            : undefined,
        sources: [
          {
            id: "coingecko",
            name: "CoinGecko simple price",
            status: row?.usd != null ? "live" : "unavailable",
            detail:
              row?.usd != null
                ? `$${row.usd} · 24h ${row.usd_24h_change?.toFixed(2)}%`
                : "No price row",
          },
          {
            id: "pcs",
            name: "PancakeSwap context",
            status: "derived",
            detail: "LP/farm framing for BSC (plan-level, not pool slot0)",
          },
        ],
        fetchedAt,
      };
    });
  } catch (e) {
    return unique.map((symbol) => ({
      symbol,
      sources: [
        {
          id: "coingecko",
          name: "CoinGecko",
          status: "unavailable",
          detail: e instanceof Error ? e.message : "fetch failed",
        },
        {
          id: "pcs",
          name: "PancakeSwap context",
          status: "derived",
          detail: "Offline mode — specialist math only",
        },
      ],
      fetchedAt,
    }));
  }
}

export function formatMarketSection(snaps: MarketSnapshot[]): string {
  if (!snaps.length) return "No market symbols resolved from brief.";
  return snaps
    .map((s) => {
      const price =
        s.priceUsd != null ? `$${s.priceUsd.toLocaleString()}` : "n/a";
      const ch =
        s.change24hPct != null
          ? `${s.change24hPct >= 0 ? "+" : ""}${s.change24hPct}% 24h`
          : "24h n/a";
      const src = s.sources
        .map((x) => `${x.name} [${x.status}] ${x.detail}`)
        .join(" · ");
      return `• ${s.symbol}: ${price} (${ch})\n  sources: ${src}`;
    })
    .join("\n");
}

export function buildThesis(opts: {
  categoryId?: string | null;
  pairOrAsset: string;
  risk: string;
  change24h?: number;
}): { bull: string; bear: string; recommendation: string } {
  const vol =
    opts.change24h != null && Math.abs(opts.change24h) > 5
      ? "elevated"
      : "moderate";
  const asset = opts.pairOrAsset;

  switch (opts.categoryId) {
    case "rebalancing":
      return {
        bull: `${asset} fee capture recovers if price re-enters a tighter fee-first band and stays in-range >70% of the week.`,
        bear: `If ${vol} vol continues, repeated rebalances burn gas and IL may dominate fees on wide ranges.`,
        recommendation:
          opts.risk === "low"
            ? "REBALANCE CONSERVATIVE — narrower band, keep 15% dry powder, reassess 24h."
            : "REBALANCE — reset to proposed band this session if OOR >30%; cap gas.",
      };
    case "grid-trading":
      return {
        bull: `Mean-reverting tape on ${asset} pays geometric grids; mid-vol fills compound on outer rungs.`,
        bear: `Trending breakouts pause inventory wrong-way; DD stop must fire before gap risk.`,
        recommendation:
          "DEPLOY GRID with DD pause armed; start at 50% size for 24h validation.",
      };
    case "yield-optimisation":
      return {
        bull: `Liquid ${asset} lending remains core; PCS satellite only when risk-adj APR clears IL/gas hurdle.`,
        bear: `Farm APRs can be emissions mirages; TVL exits strand capital.`,
        recommendation:
          "ALLOCATE barbell — core lend first, satellite farm second, keep dry powder.",
      };
    case "health-factor":
      return {
        bull: `Buffer above soft alert leaves room for planned delever without panic.`,
        bear: `Correlated collateral dump can compress HF faster than linear model.`,
        recommendation:
          "PROTECT — stage repay path now; act at hard alert without delay.",
      };
    default:
      return {
        bull: "Specialist framing supports a staged plan under stated risk.",
        bear: "Missing live positions or stale inputs reduce confidence.",
        recommendation: "PROCEED with checklist; verify live UI before capital moves.",
      };
  }
}
