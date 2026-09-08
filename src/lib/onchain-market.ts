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
/** PancakeSwap V3 NonfungiblePositionManager (BSC) */
export const PCS_V3_NPM = "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364";
/** Venus Unitroller / Comptroller (BSC mainnet) */
export const VENUS_COMPTROLLER =
  "0xfD36E2c2a6789Db23113685031d7F163148AFc09";
const GET_ACCOUNT_LIQUIDITY = "0x5ec88c79";

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
  naiveAprPct?: number | null;
  ok: boolean;
  detail: string;
};

export type OnchainMarket = {
  fetchedAt: string;
  rpc: string | null;
  pools: OnchainPool[];
  venus: OnchainVenus[];
  blockTimeSec?: number | null;
  blocksPerYear?: number | null;
  blockTimeSource?: string;
};

/** 3-second blocks — still what many published BSC yield figures assume. */
export const NAIVE_BLOCKS_PER_YEAR = 10_512_000;
const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
const ASSUMED_BLOCK_SEC = 0.45;

const CORE_VTOKENS: { asset: string; address: string }[] = [
  { asset: "lisUSD", address: "0x689e0dab47ab16bcae87ec18491692bf621dc6ab" },
  { asset: "USDT", address: "0xfD5840Cd36d94D7229439859C0112a4185BC0255" },
  { asset: "FDUSD", address: "0xc4eF4229FEC74CCFE17B2BDEF7715FAC740BA0BA" },
  { asset: "USDC", address: "0xeca88125a5adbe82614ffc12d0db554e2e2867c8" },
  { asset: "BNB", address: "0xA07c5b74C9B40447a954e1466938b865b6BBea36" },
  { asset: "ETH", address: "0xf508fCD89b8bd15579dc79A6827cB4686A3592c8" },
];

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

async function rpcResult(
  rpc: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  try {
    const res = await jobFetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal:
        typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
          ? AbortSignal.timeout(3500)
          : undefined,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: unknown };
    return json.result ?? null;
  } catch {
    return null;
  }
}

async function measureBlockTime(rpc: string): Promise<{
  sec: number;
  blocksPerYear: number;
  from: number;
  to: number;
} | null> {
  const latest = (await rpcResult(rpc, "eth_getBlockByNumber", [
    "latest",
    false,
  ])) as { number?: string; timestamp?: string } | null;
  if (!latest?.number || !latest.timestamp) return null;
  const to = parseInt(latest.number, 16);
  const span = 200;
  const from = Math.max(1, to - span);
  const older = (await rpcResult(rpc, "eth_getBlockByNumber", [
    `0x${from.toString(16)}`,
    false,
  ])) as { timestamp?: string } | null;
  if (!older?.timestamp) return null;
  const t1 = parseInt(latest.timestamp, 16);
  const t0 = parseInt(older.timestamp, 16);
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return null;
  const sec = (t1 - t0) / (to - from);
  if (sec < 0.2 || sec > 4) return null;
  return { sec, blocksPerYear: SECONDS_PER_YEAR / sec, from, to };
}

async function readVenusMarket(
  rpc: string,
  asset: string,
  address: string,
  blocksPerYear: number,
): Promise<OnchainVenus> {
  const hex = await ethCall(rpc, address, "0xae9d70b0");
  if (!hex) {
    return {
      asset,
      supplyAprPct: null,
      ok: false,
      detail: `v${asset} supplyRatePerBlock failed`,
    };
  }
  const rate = decodeUint(hex, 0);
  const perBlock = Number(rate) / 1e18;
  const apr = perBlock * blocksPerYear * 100;
  const naive = perBlock * NAIVE_BLOCKS_PER_YEAR * 100;
  if (!Number.isFinite(apr)) {
    return {
      asset,
      supplyAprPct: null,
      ok: false,
      detail: "rate decode failed",
    };
  }
  if (apr > 200) {
    return {
      asset,
      supplyAprPct: null,
      naiveAprPct: Number.isFinite(naive) ? Math.round(naive * 100) / 100 : null,
      ok: false,
      detail: `implausible supply APR ${apr.toExponential(2)} — skipped (deprecated market?)`,
    };
  }
  return {
    asset,
    supplyAprPct: Math.round(apr * 10000) / 10000,
    naiveAprPct: Math.round(naive * 10000) / 10000,
    ok: true,
    detail: `Venus v${asset} supplyRatePerBlock`,
  };
}

export async function fetchOnchainMarket(): Promise<OnchainMarket> {
  const fetchedAt = new Date().toISOString();
  let rpc: string | null = null;
  let pools: OnchainPool[] = [];
  let venus: OnchainVenus[] = [];
  let blockTimeSec: number | null = null;
  let blocksPerYear: number | null = null;
  let blockTimeSource = "unavailable";

  for (const url of RPCS) {
    const probe = await readPool(url, WBNB, USDT, 500, "BNB/USDT", "USDT per BNB");
    if (probe.ok || probe.pool) {
      rpc = url;
      const measured = await measureBlockTime(url);
      if (measured) {
        blockTimeSec = measured.sec;
        blocksPerYear = measured.blocksPerYear;
        blockTimeSource = `measured over ${measured.to - measured.from} blocks (${measured.from}–${measured.to})`;
      } else {
        blockTimeSec = ASSUMED_BLOCK_SEC;
        blocksPerYear = SECONDS_PER_YEAR / ASSUMED_BLOCK_SEC;
        blockTimeSource = `assumed ${ASSUMED_BLOCK_SEC}s BSC post-Maxwell — not measured this call`;
      }
      const bpy = blocksPerYear;
      const [cake, ...markets] = await Promise.all([
        readPool(url, CAKE, USDT, 2500, "CAKE/USDT", "USDT per CAKE"),
        ...CORE_VTOKENS.map((v) =>
          readVenusMarket(url, v.asset, v.address, bpy),
        ),
      ]);
      pools = [probe, cake];
      venus = markets
        .slice()
        .sort((a, b) => (b.supplyAprPct ?? -1) - (a.supplyAprPct ?? -1));
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

  return {
    fetchedAt,
    rpc,
    pools,
    venus,
    blockTimeSec,
    blocksPerYear,
    blockTimeSource,
  };
}

export type PcsNftPosition = {
  nftId: string;
  ok: boolean;
  token0: string | null;
  token1: string | null;
  feeBps: number | null;
  tickLower: number | null;
  tickUpper: number | null;
  liquidity: string | null;
  detail: string;
};

function decodeAddrSlot(hex: string, slot: number): string {
  const h = hex.replace(/^0x/i, "");
  const start = slot * 64 + 24;
  return `0x${h.slice(start, start + 40).toLowerCase()}`;
}

function decodeInt24Slot(hex: string, slot: number): number {
  const word = decodeUint(hex, slot);
  const signed = word >= BigInt(1) << BigInt(255)
    ? word - (BigInt(1) << BigInt(256))
    : word;
  return Number(signed);
}

export async function fetchPcsNftPosition(
  nftId: string,
): Promise<PcsNftPosition> {
  const id = nftId.replace(/\D/g, "");
  const empty: PcsNftPosition = {
    nftId: id,
    ok: false,
    token0: null,
    token1: null,
    feeBps: null,
    tickLower: null,
    tickUpper: null,
    liquidity: null,
    detail: "No NFT id",
  };
  if (!id) return empty;
  const data = `0x99fbab88${padUint(BigInt(id))}`;
  for (const rpc of RPCS) {
    const hex = await ethCall(rpc, PCS_V3_NPM, data);
    if (!hex || hex === "0x") continue;
    try {
      const token0 = decodeAddrSlot(hex, 2);
      const token1 = decodeAddrSlot(hex, 3);
      const fee = Number(decodeUint(hex, 4));
      const tickLower = decodeInt24Slot(hex, 5);
      const tickUpper = decodeInt24Slot(hex, 6);
      const liq = decodeUint(hex, 7).toString();
      return {
        nftId: id,
        ok: true,
        token0,
        token1,
        feeBps: Number.isFinite(fee) ? fee / 100 : null,
        tickLower,
        tickUpper,
        liquidity: liq,
        detail: `NPM ${PCS_V3_NPM} · ${rpc.replace(/^https:\/\//, "")}`,
      };
    } catch {
      continue;
    }
  }
  return {
    ...empty,
    detail: "positions() eth_call failed — NFT not read",
  };
}

export function formatPcsNftSection(p: PcsNftPosition): string {
  if (!p.ok) {
    return `PCS V3 NFT #${p.nftId}: unavailable — ${p.detail}. Band math falls back to the brief.`;
  }
  return [
    `PCS V3 NFT #${p.nftId} (read-only — we do not touch the position)`,
    `• token0 ${p.token0}`,
    `• token1 ${p.token1}`,
    `• fee ${p.feeBps}% · tickLower ${p.tickLower} · tickUpper ${p.tickUpper}`,
    `• liquidity ${p.liquidity}`,
    `• ${p.detail}`,
  ].join("\n");
}

export type VenusAccount = {
  wallet: string;
  ok: boolean;
  errorCode: string | null;
  liquidityUsd: number | null;
  shortfallUsd: number | null;
  detail: string;
};

/**
 * Venus getAccountLiquidity — excess / shortfall in USD 1e18.
 * Not an Aave-style health factor. We do not map this to HF 1.45.
 */
export async function fetchVenusAccount(
  wallet: string,
): Promise<VenusAccount> {
  const w = wallet.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(w)) {
    return {
      wallet: w,
      ok: false,
      errorCode: null,
      liquidityUsd: null,
      shortfallUsd: null,
      detail: "Not a 20-byte hex address",
    };
  }
  const data = `${GET_ACCOUNT_LIQUIDITY}${padAddr(w)}`;
  for (const rpc of RPCS) {
    const hex = await ethCall(rpc, VENUS_COMPTROLLER, data);
    if (!hex) continue;
    const err = decodeUint(hex, 0);
    const liq = decodeUint(hex, 1);
    const short = decodeUint(hex, 2);
    const liqUsd = Number(liq) / 1e18;
    const shortUsd = Number(short) / 1e18;
    if (err !== BigInt(0)) {
      return {
        wallet: w,
        ok: false,
        errorCode: err.toString(),
        liquidityUsd: null,
        shortfallUsd: null,
        detail: `Venus comptroller error ${err}`,
      };
    }
    return {
      wallet: w,
      ok: true,
      errorCode: null,
      liquidityUsd: Number.isFinite(liqUsd) ? liqUsd : null,
      shortfallUsd: Number.isFinite(shortUsd) ? shortUsd : null,
      detail:
        shortUsd > 0
          ? `shortfall ~$${shortUsd.toFixed(2)} (underwater — not a health factor)`
          : `excess liquidity ~$${liqUsd.toFixed(2)} (not mapped to HF)`,
    };
  }
  return {
    wallet: w,
    ok: false,
    errorCode: null,
    liquidityUsd: null,
    shortfallUsd: null,
    detail: "Venus getAccountLiquidity eth_call failed",
  };
}

export function formatVenusAccountSection(a: VenusAccount): string {
  return [
    `Venus account ${a.wallet}`,
    `• ${a.ok ? a.detail : `unavailable — ${a.detail}`}`,
    a.liquidityUsd != null
      ? `• excess liquidity USD: ${a.liquidityUsd.toFixed(4)}`
      : "• excess liquidity USD: unavailable",
    a.shortfallUsd != null
      ? `• shortfall USD: ${a.shortfallUsd.toFixed(4)}`
      : "• shortfall USD: unavailable",
    "• This is Compound-style liquidity/shortfall, not an invented health factor.",
  ].join("\n");
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
  const usdt = m.venus.find((v) => v.asset === "USDT" && v.ok);
  const naiveNote =
    usdt?.naiveAprPct != null
      ? `Naive 3s-constant USDT supply APR would be ${usdt.naiveAprPct}% — the old ${NAIVE_BLOCKS_PER_YEAR.toLocaleString("en-US")} blocks/year understates live BSC rates.`
      : `The old ${NAIVE_BLOCKS_PER_YEAR.toLocaleString("en-US")} blocks/year (3s) constant understates live BSC rates by ~6.7x.`;
  const btLine =
    m.blockTimeSec != null && m.blocksPerYear != null
      ? `Block time ${m.blockTimeSec.toFixed(4)}s · ~${Math.round(m.blocksPerYear).toLocaleString("en-US")} blocks/year (${m.blockTimeSource || "measured"}). ${naiveNote}`
      : `Block time unavailable. ${naiveNote}`;
  const top = m.venus.find((v) => v.ok && v.supplyAprPct != null);
  const rankLead = top
    ? `Top live venue in this scan: Venus ${top.asset} at ${top.supplyAprPct}% supply APR.`
    : "No Venus market returned a usable supply APR this call.";
  return [
    "Live BSC reads (eth_call). If a line is unavailable, the plan falls back to specialist math — we do not invent a tick or APR.",
    "",
    "PancakeSwap V3 slot0",
    ...poolLines,
    "",
    "Venus lending — supply APR from supplyRatePerBlock × measured blocks/year",
    btLine,
    rankLead,
    ...venusLines,
    "",
    `Fetched ${m.fetchedAt}${m.rpc ? ` · ${m.rpc.replace(/^https:\/\//, "")}` : ""}`,
  ].join("\n");
}
