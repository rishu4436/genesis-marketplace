/**
 * Live BSC reads for hire plans: PCS V3 slot0 + Venus supply rate.
 * Failures stay labeled unavailable — we do not invent a tick or APR.
 */

import { jobFetch } from "./job-isolation";

export const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
export const USDT = "0x55d398326f99059fF775485246999027B3197955";
export const CAKE = "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82";
export const PCS_V3_FACTORY = "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";
export const VUSDT = "0xfD5840Cd36d94D7229439859C0112a4185BC0255";

const RPCS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.bnbchain.org",
];

export type OnchainPool = {
  pair: string;
  feeBps: number;
  pool: string;
  tick: number | null;
  price: number | null;
  quote: string;
  ok: boolean;
  detail: string;
};

export type OnchainVenus = {
  asset: string;
  supplyAprPct: number | null;
  ok: boolean;
  detail: string;
};

export type OnchainMarket = {
  fetchedAt: string;
  rpc: string | null;
  pools: OnchainPool[];
  venus: OnchainVenus[];
};

function padAddr(a: string): string {
  return a.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function padUint(n: number | bigint): string {
  return BigInt(n).toString(16).padStart(64, "0");
}

function sortedPair(a: string, b: string): [string, string] {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  return aa < bb ? [a, b] : [b, a];
}

async function ethCall(
  rpc: string,
  to: string,
  data: string,
): Promise<string | null> {
  try {
    const res = await jobFetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
      signal:
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(3500)
          : undefined,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string; error?: { message?: string } };
    if (!json.result || json.result === "0x") return null;
    return json.result;
  } catch {
    return null;
  }
}

function decodeAddress(hex: string): string | null {
  const h = hex.replace(/^0x/i, "");
  if (h.length < 64) return null;
  const addr = `0x${h.slice(-40)}`;
  if (/^0x0+$/i.test(addr)) return null;
  return addr;
}

function decodeUint(hex: string, word = 0): bigint {
  const h = hex.replace(/^0x/i, "");
  const slice = h.slice(word * 64, word * 64 + 64);
  if (!slice) return BigInt(0);
  return BigInt("0x" + slice);
}

function decodeInt24Tick(hex: string): number {
  const word = decodeUint(hex, 1);
  const mask = (BigInt(1) << BigInt(24)) - BigInt(1);
  let n = Number(word & mask);
  if (n >= 1 << 23) n -= 1 << 24;
  return n;
}

function priceFromSqrtX96(sqrtPriceX96: bigint): number {
  const q = Number(sqrtPriceX96) / 2 ** 96;
  return q * q;
}

async function readPool(
  rpc: string,
  base: string,
  quoteToken: string,
  fee: number,
  pair: string,
  quote: string,
): Promise<OnchainPool> {
  const [t0, t1] = sortedPair(base, quoteToken);
  const getPoolData = `0x1698ee82${padAddr(t0)}${padAddr(t1)}${padUint(fee)}`;
  const poolHex = await ethCall(rpc, PCS_V3_FACTORY, getPoolData);
  const pool = poolHex ? decodeAddress(poolHex) : null;
  if (!pool) {
    return {
      pair,
      feeBps: fee / 100,
      pool: "",
      tick: null,
      price: null,
      quote,
      ok: false,
      detail: "factory getPool empty",
    };
  }
  const slot = await ethCall(rpc, pool, "0x3850c7bd");
  if (!slot) {
    return {
      pair,
      feeBps: fee / 100,
      pool,
      tick: null,
      price: null,
      quote,
      ok: false,
      detail: "slot0 call failed",
    };
  }
  const sqrtP = decodeUint(slot, 0);
  const tick = decodeInt24Tick(slot);
  let price = priceFromSqrtX96(sqrtP);
  if (!Number.isFinite(price) || price <= 0) {
    return {
      pair,
      feeBps: fee / 100,
      pool,
      tick,
      price: null,
      quote,
      ok: false,
      detail: "sqrtPrice unusable",
    };
  }
  if (t0.toLowerCase() === quoteToken.toLowerCase()) {
    price = 1 / price;
  }
  return {
    pair,
    feeBps: fee / 100,
    pool,
    tick,
    price: Number(price.toPrecision(6)),
    quote,
    ok: true,
    detail: `slot0 tick ${tick}`,
  };
}

async function readVenusSupply(rpc: string): Promise<OnchainVenus> {
  const hex = await ethCall(rpc, VUSDT, "0xae9d70b0");
  if (!hex) {
    return {
      asset: "USDT",
      supplyAprPct: null,
      ok: false,
      detail: "vUSDT supplyRatePerBlock failed",
    };
  }
  const rate = decodeUint(hex, 0);
  const blocksYear = 10_512_000;
  const apr = (Number(rate) / 1e18) * blocksYear * 100;
  if (!Number.isFinite(apr)) {
    return {
      asset: "USDT",
      supplyAprPct: null,
      ok: false,
      detail: "rate decode failed",
    };
  }
  return {
    asset: "USDT",
    supplyAprPct: Math.round(apr * 100) / 100,
    ok: true,
    detail: `Venus vUSDT supplyRatePerBlock`,
  };
}

export async function fetchOnchainMarket(): Promise<OnchainMarket> {
  const fetchedAt = new Date().toISOString();
  let rpc: string | null = null;
  let pools: OnchainPool[] = [];
  let venus: OnchainVenus[] = [];

  for (const url of RPCS) {
    const probe = await readPool(url, WBNB, USDT, 500, "BNB/USDT", "USDT per BNB");
    if (probe.ok || probe.pool) {
      rpc = url;
      const cake = await readPool(url, CAKE, USDT, 2500, "CAKE/USDT", "USDT per CAKE");
      const ven = await readVenusSupply(url);
      pools = [probe, cake];
      venus = [ven];
      break;
    }
  }

  if (!rpc) {
    return {
      fetchedAt,
      rpc: null,
      pools: [
        {
          pair: "BNB/USDT",
          feeBps: 5,
          pool: "",
          tick: null,
          price: null,
          quote: "USDT per BNB",
          ok: false,
          detail: "BSC RPC unreachable",
        },
      ],
      venus: [
        {
          asset: "USDT",
          supplyAprPct: null,
          ok: false,
          detail: "BSC RPC unreachable",
        },
      ],
    };
  }

  return { fetchedAt, rpc, pools, venus };
}

export function formatOnchainSection(m: OnchainMarket): string {
  const poolLines = m.pools.map((p) => {
    if (!p.ok || p.price == null) {
      return `• ${p.pair} (${p.feeBps}%): unavailable — ${p.detail}`;
    }
    return `• ${p.pair} PCS V3 ${p.feeBps}%: ${p.price} ${p.quote} · tick ${p.tick}\n  pool ${p.pool} · ${p.detail}`;
  });
  const venusLines = m.venus.map((v) => {
    if (!v.ok || v.supplyAprPct == null) {
      return `• Venus ${v.asset} supply APR: unavailable — ${v.detail}`;
    }
    return `• Venus ${v.asset} supply APR: ${v.supplyAprPct}% (on-chain rate, not a promise)`;
  });
  return [
    "Live BSC reads (eth_call). If a line is unavailable, the plan falls back to specialist math — we do not invent a tick.",
    "",
    "PancakeSwap V3 slot0",
    ...poolLines,
    "",
    "Venus lending",
    ...venusLines,
    "",
    `Fetched ${m.fetchedAt}${m.rpc ? ` · ${m.rpc.replace(/^https:\/\//, "")}` : ""}`,
  ].join("\n");
}
