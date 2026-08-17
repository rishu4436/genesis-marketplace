/**
 * Expert specialist engine — parses buyer briefs and produces excellent,
 * structured deliverables for Genesis agents (plan-only, no custody).
 */

import type { CategoryId } from "./categories";
import type { GenesisAgent } from "./genesis-agents";
import type { HireDeliverable, HireJob } from "./hire-engine";

export type ParsedBrief = {
  raw: string;
  pair?: string;
  asset?: string;
  pcts: number[];
  levels?: number;
  budgetHint?: number;
  gasHint?: number;
  low?: number;
  high?: number;
  protocol?: string;
  keywords: string[];
};

/** Known crypto tickers — never invent assets from English words */
const KNOWN_ASSETS = new Set([
  "CAKE",
  "BNB",
  "WBNB",
  "ETH",
  "BTC",
  "USDT",
  "USDC",
  "BUSD",
  "DAI",
  "FDUSD",
  "TUSD",
  "XVS",
  "LINK",
  "DOT",
  "ADA",
  "SOL",
  "ARB",
  "OP",
  "MATIC",
  "POL",
]);

const STOP_WORDS = new Set([
  "risk",
  "adjusted",
  "best",
  "safe",
  "high",
  "highest",
  "lowest",
  "find",
  "propose",
  "design",
  "simulate",
  "between",
  "under",
  "about",
  "after",
  "before",
  "with",
  "from",
  "level",
  "levels",
  "grid",
  "band",
  "percent",
  "budget",
  "lending",
  "farms",
  "farm",
  "yield",
  "route",
  "plan",
  "shock",
  "collateral",
  "health",
  "factor",
  "repay",
  "add",
  "pause",
  "drawdown",
  "geometric",
  "medium",
  "low",
  "high",
  "once",
  "bsc",
  "pcs",
  "pancake",
  "venus",
  "aave",
  "lista",
  "gas",
  "apr",
  "fee",
  "vs",
  "for",
  "the",
  "and",
  "usd",
]);

function isTicker(s: string): boolean {
  const u = s.toUpperCase();
  return KNOWN_ASSETS.has(u) && !STOP_WORDS.has(s.toLowerCase());
}

export function parseBrief(task: string): ParsedBrief {
  const raw = task.trim();
  const lower = raw.toLowerCase();

  // Percents: "6%", "6 percent", "−15%", "-15 percent"
  const pcts: number[] = [];
  const pctRe =
    /(-?\d+(?:\.\d+)?)\s*(?:%|percent|pct)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = pctRe.exec(raw)) !== null) {
    pcts.push(Number(m[1]));
  }

  // Explicit pair: CAKE/USDT, CAKE-USDT, CAKE USDT (known tickers only)
  let pair: string | undefined;
  const slash = raw.match(
    /\b([A-Za-z]{2,10})\s*[\/\-]\s*([A-Za-z]{2,10})\b/,
  );
  if (slash && isTicker(slash[1]) && isTicker(slash[2])) {
    pair = `${slash[1].toUpperCase()}-${slash[2].toUpperCase()}`;
  }

  // Asset: "for USDT", "USDT on BSC", bare known tickers
  let asset: string | undefined;
  const forAsset = raw.match(
    /\b(?:for|in|of|idle)\s+([A-Za-z]{2,10})\b/i,
  );
  if (forAsset && isTicker(forAsset[1])) {
    asset = forAsset[1].toUpperCase();
  }
  if (!asset) {
    const onBsc = raw.match(/\b([A-Za-z]{2,10})\s+on\s+BSC\b/i);
    if (onBsc && isTicker(onBsc[1])) asset = onBsc[1].toUpperCase();
  }
  if (!asset && !pair) {
    // Scan tokens; pick first known asset preferring stables last
    const tokens = raw.toUpperCase().match(/\b[A-Z]{2,10}\b/g) || [];
    const found = tokens.filter((t) => KNOWN_ASSETS.has(t));
    const nonStable = found.find((t) => !["USDT", "USDC", "BUSD", "DAI", "FDUSD", "TUSD"].includes(t));
    asset = nonStable || found[0];
  }
  if (pair && !asset) {
    asset = pair.split("-")[0];
  }

  // Levels: "12 levels", "12-level", "12 level geometric"
  const levelM = raw.match(/\b(\d{1,3})[-\s]*(?:levels?|rungs?)\b/i);
  const levels = levelM ? Number(levelM[1]) : undefined;

  // Capital / allocation budget (not gas, not job price)
  // "under 2000 USD", "$2000", "budget 5000", "idle 5000 USDT"
  let budgetHint: number | undefined;
  const capitalPatterns = [
    /\bunder\s+\$?\s*(\d+(?:\.\d+)?)\s*(?:usd|usdt|usdc|dollars?)?\b/i,
    /\b(?:capital|notional|allocate|allocation|size)\s*[:=]?\s*\$?\s*(\d+(?:\.\d+)?)/i,
    /\bidle\s+(\d+(?:\.\d+)?)\s*(?:usd|usdt|usdc)?\b/i,
    /\$\s*(\d{3,}(?:\.\d+)?)\b/, // $2000+ likely capital
    /\b(\d{3,})\s*(?:usd|usdt|usdc)\b/i,
  ];
  for (const re of capitalPatterns) {
    const cm = raw.match(re);
    if (cm) {
      const n = Number(cm[1]);
      if (n >= 50) {
        budgetHint = n;
        break;
      }
    }
  }

  // Gas: "gas under 3", "gas budget $2", "gas ≤ $3"
  let gasHint: number | undefined;
  const gasM = raw.match(
    /\bgas\s*(?:budget|cap)?\s*(?:under|<=|≤|<|of|=|:)?\s*\$?\s*(\d+(?:\.\d+)?)/i,
  );
  if (gasM) gasHint = Number(gasM[1]);

  // Grid bounds
  const rangeM = raw.match(
    /between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)/i,
  );
  const low = rangeM ? Number(rangeM[1] || rangeM[3]) : undefined;
  const high = rangeM ? Number(rangeM[2] || rangeM[4]) : undefined;

  let protocol: string | undefined;
  if (lower.includes("venus")) protocol = "Venus";
  else if (lower.includes("aave")) protocol = "Aave-style";
  else if (lower.includes("lista")) protocol = "Lista";
  else if (lower.includes("pancake") || lower.includes("pcs"))
    protocol = "PancakeSwap";

  const keywords = lower
    .split(/[^a-z0-9%]+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    .slice(0, 24);

  // Default asset for yield when nothing found
  if (!asset && !pair) asset = "USDT";

  return {
    raw,
    pair,
    asset,
    pcts,
    levels,
    budgetHint,
    gasHint,
    low,
    high,
    protocol,
    keywords,
  };
}

function conf(p: ParsedBrief): number {
  let c = 55;
  if (p.pair) c += 12;
  if (p.asset && KNOWN_ASSETS.has(p.asset)) c += 8;
  if (p.pcts.length) c += 10;
  if (p.levels) c += 8;
  if (p.budgetHint && p.budgetHint >= 50) c += 8;
  if (p.gasHint != null) c += 4;
  if (p.low != null && p.high != null) c += 10;
  if (p.protocol) c += 6;
  if (p.raw.length > 40) c += 5;
  return Math.min(96, c);
}

function checklist(items: string[]): string {
  return items.map((i, n) => `${n + 1}. ${i}`).join("\n");
}

function table(rows: [string, string][]): string {
  return rows.map(([k, v]) => `• ${k}: ${v}`).join("\n");
}

/** Capital for allocation plans — prefer parsed notional over job price */
function capitalBudget(p: ParsedBrief, job: HireJob): number {
  if (p.budgetHint != null && p.budgetHint >= 50) return p.budgetHint;
  const jobPrice = Number(job.budgetUsd);
  // job.budgetUsd is often the agent *price* ($6–10), not capital
  if (jobPrice >= 50) return jobPrice;
  return 1000; // sensible default notional for yield/grid plans
}

export function buildExpertDeliverable(
  job: HireJob,
  g?: GenesisAgent,
): HireDeliverable {
  const cat = (job.categoryId || g?.categoryId || "rebalancing") as CategoryId;
  const p = parseBrief(job.task);
  const name = g?.name || job.agentName;
  const confidence = conf(p);
  const capital = capitalBudget(p, job);
  const jobPrice = Number(job.budgetUsd) || g?.basePriceUsd || 10;

  switch (cat) {
    case "rebalancing":
      return expertRebalance(job, g, p, name, confidence, capital, jobPrice);
    case "grid-trading":
      return expertGrid(job, g, p, name, confidence, capital);
    case "yield-optimisation":
      return expertYield(job, g, p, name, confidence, capital, p.gasHint);
    case "health-factor":
      return expertHealth(job, g, p, name, confidence, capital);
    default:
      return expertGeneric(job, g, p, name, confidence, capital);
  }
}

function expertRebalance(
  job: HireJob,
  g: GenesisAgent | undefined,
  p: ParsedBrief,
  name: string,
  confidence: number,
  capital: number,
  jobPrice: number,
): HireDeliverable {
  const pair = p.pair || "CAKE-USDT";
  // Prefer positive small % as band width (e.g. 6 percent)
  const width =
    p.pcts.find((x) => x > 0 && x <= 30) ??
    (job.risk === "high" ? 10 : job.risk === "low" ? 4.5 : 6.5);
  const oor = Math.min(55, 22 + width * 1.8);
  const feeAprLow = Math.max(8, 28 - width);
  const feeAprHigh = feeAprLow + 8;
  const il = (width * 0.22).toFixed(1);
  const lowerW = (width * 0.95).toFixed(1);
  const upperW = (width * 1.05).toFixed(1);
  const gas =
    p.gasHint ?? Math.max(1.2, Math.min(3, jobPrice * 0.25));

  return {
    title: `LP rebalance plan · ${pair} (PCS V3)`,
    summary: `RangeKeeper assessed ${pair} concentrated liquidity. With a ±${width}% working band, estimated time-out-of-range is elevated (~${oor.toFixed(0)}% of recent window). Reset to a fee-first band and stage gas ≤ $${gas.toFixed(2)}. Confidence ${confidence}/100 based on brief detail.`,
    sections: [
      {
        heading: "Brief intake",
        body: table([
          ["Task", job.task],
          ["Pair (resolved)", pair],
          ["Risk posture", job.risk],
          ["Position notional context", `~$${capital}`],
          ["Gas budget", `$${gas.toFixed(2)}`],
          [
            "Skills applied",
            (g?.skills || []).slice(0, 3).join(" · ") || "LP range",
          ],
        ]),
      },
      {
        heading: "Range diagnosis",
        body: table([
          ["Assumption", "PCS V3 concentrated position near range edge"],
          ["Est. time out-of-range (24–48h)", `~${oor.toFixed(0)}%`],
          [
            "Fee capture vs in-range baseline",
            "Degraded — outer ticks under-used",
          ],
          [
            "IL sensitivity",
            `±${width}% move → ~${il}% IL (order-of-magnitude)`,
          ],
        ]),
      },
      {
        heading: "Recommended band",
        body: table([
          ["Center", "Current mark (spot)"],
          ["Lower", `mark − ${lowerW}%`],
          ["Upper", `mark + ${upperW}% (mild upside bias)`],
          ["Idle capital", "Keep ~10% outside LP for a second rebalance"],
          [
            "Fee APR (in-range est.)",
            `${feeAprLow.toFixed(0)}–${feeAprHigh.toFixed(0)}%`,
          ],
        ]),
      },
      {
        heading: "Execution checklist (you hold keys)",
        body: checklist([
          `Confirm pool ${pair} fee tier and current tick on PancakeSwap`,
          "Remove liquidity only after noting NFT token id / position id",
          `Mint new position at ±${width}% band; verify amounts vs slippage limit 0.5%`,
          `Cap gas for full reset under $${gas.toFixed(2)} on BSC`,
          "Set calendar reminder 24h to re-check time-in-range",
          "Do not approve unlimited spend beyond the router you trust",
        ]),
      },
      {
        heading: "Risks & stop rules",
        body: table([
          [
            "Abort rebalance if",
            "Gas spike > 2× estimate or pool TVL collapsed",
          ],
          [
            "Re-open earlier if",
            "Mark exits new band within 6h (vol expansion)",
          ],
          [
            "Custody",
            "Genesis / agent never hold your LP NFT or private keys",
          ],
        ]),
      },
      {
        heading: "Monitoring plan",
        body: checklist([
          "Alert if time-out-of-range > 35% over 12h",
          "Alert if fee APR (rolling) drops > 40% vs post-rebalance day-1",
          "Weekly: IL vs fees cumulative — keep LP only if fees > IL + gas",
        ]),
      },
    ],
    metrics: [
      { label: "Pair", value: pair },
      { label: "Band width", value: `±${width}%` },
      {
        label: "Fee APR est.",
        value: `${feeAprLow.toFixed(0)}–${feeAprHigh.toFixed(0)}%`,
      },
      { label: "IL @ ±band", value: `~${il}%` },
      { label: "Gas budget", value: `$${gas.toFixed(2)}` },
      { label: "Confidence", value: `${confidence}/100` },
      { label: "Agent", value: name },
    ],
    disclaimer:
      "Expert plan from RangeKeeper — illustrative math from your brief, not live on-chain reads unless connected. Not financial advice. No funds moved.",
  };
}

function expertGrid(
  job: HireJob,
  g: GenesisAgent | undefined,
  p: ParsedBrief,
  name: string,
  confidence: number,
  capital: number,
): HireDeliverable {
  const pair = p.pair || "BNB-USDT";
  const levels = Math.min(48, Math.max(6, p.levels || 12));
  let low = p.low;
  let high = p.high;
  if (low == null || high == null || high <= low) {
    low = 0.94;
    high = 1.06;
  }
  const mid = (low + high) / 2;
  const span = (high - low) / mid;
  const spacingPct = ((span / (levels - 1)) * 100).toFixed(2);
  const deploy = capital >= 50 ? capital : 500;
  const perLevel = (deploy / levels).toFixed(2);
  const ddFromPct = p.pcts.find((x) => x > 0 && x <= 25);
  const ddPause =
    ddFromPct ??
    (job.risk === "high" ? 9 : job.risk === "low" ? 4 : 6);
  const fills = Math.max(3, Math.round(levels * 0.45));

  return {
    title: `Grid layout · ${pair} · ${levels} levels`,
    summary: `Gridwright designed a geometric ${levels}-level grid on ${pair} from ${low} → ${high} (mid ${mid.toFixed(4)}). Spacing ~${spacingPct}% · ~$${perLevel}/level on ~$${deploy} notional · pause if unrealized DD ≥ ${ddPause}%. Confidence ${confidence}/100.`,
    sections: [
      {
        heading: "Brief intake",
        body: table([
          ["Task", job.task],
          ["Pair", pair],
          ["Levels", String(levels)],
          ["Bounds", `${low} – ${high}`],
          ["Deployable notional", `$${deploy}`],
        ]),
      },
      {
        heading: "Grid parameters",
        body: table([
          ["Mode", "Geometric (equal % steps)"],
          ["Spacing", `~${spacingPct}% per step`],
          ["Inventory at mid", "50% base / 50% quote"],
          ["Notional / level", `≈ $${perLevel}`],
          ["Order type", "Limit grid — you place or bot executes"],
        ]),
      },
      {
        heading: "Level map (compressed)",
        body: buildLevelSketch(low, high, levels, mid),
      },
      {
        heading: "Risk controls",
        body: table([
          ["Drawdown pause", `${ddPause}% vs mid inventory mark`],
          ["Resume", "Manual only after you review vol regime"],
          ["Max open levels", String(levels)],
          ["Risk posture", job.risk],
        ]),
      },
      {
        heading: "24h fill sketch",
        body: `Under mid-vol mean reversion, expect ~${fills}–${fills + 3} fills on outer/inner rungs. Est. gross edge 0.12–0.40% of deployed notional before fees; net depends on maker fee tier on PCS/spot venue.`,
      },
      {
        heading: "Execution checklist",
        body: checklist([
          `Set low=${low} high=${high} on your grid UI or bot`,
          `Configure ${levels} geometric levels; size ≈ $${perLevel} each`,
          `Enable pause when unrealized DD ≥ ${ddPause}%`,
          "Start with 50% capital; scale after 24h of stable fills",
          "Never give the agent withdrawal rights — plan only",
        ]),
      },
    ],
    metrics: [
      { label: "Pair", value: pair },
      { label: "Levels", value: String(levels) },
      { label: "Spacing", value: `~${spacingPct}%` },
      { label: "DD pause", value: `${ddPause}%` },
      { label: "$ / level", value: `$${perLevel}` },
      { label: "Notional", value: `$${deploy}` },
      { label: "Confidence", value: `${confidence}/100` },
      { label: "Agent", value: name },
    ],
    disclaimer:
      "Strategy brief from Gridwright. Bounds inferred when not provided. You place orders. Not financial advice.",
  };
}

function buildLevelSketch(
  low: number,
  high: number,
  levels: number,
  mid: number,
): string {
  const n = Math.min(levels, 8);
  const lines: string[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1 || 1);
    const price = low * Math.pow(high / low, t);
    const side = price < mid ? "BUY" : price > mid ? "SELL" : "MID";
    lines.push(`L${i + 1}: ${price.toFixed(4)} · ${side}`);
  }
  if (levels > n) lines.push(`… +${levels - n} levels omitted`);
  return lines.join("\n");
}

function expertYield(
  job: HireJob,
  g: GenesisAgent | undefined,
  p: ParsedBrief,
  name: string,
  confidence: number,
  capital: number,
  gasHint?: number,
): HireDeliverable {
  // Never use English noise as asset
  let asset = p.asset && KNOWN_ASSETS.has(p.asset) ? p.asset : "USDT";
  if (p.pair) {
    const [a, b] = p.pair.split("-");
    if (KNOWN_ASSETS.has(a) && ["USDT", "USDC", "BUSD", "DAI"].includes(b)) {
      asset = a === "BNB" || a === "WBNB" || a === "CAKE" ? b : a;
      // For yield "USDT on BSC" keep stable; for "BNB yield" use BNB
      if (p.raw.toUpperCase().includes("USDT")) asset = "USDT";
      else if (KNOWN_ASSETS.has(a)) asset = a;
    }
  }
  // Force USDT if brief clearly about USDT
  if (/\busdt\b/i.test(p.raw)) asset = "USDT";
  if (/\busdc\b/i.test(p.raw) && !/\busdt\b/i.test(p.raw)) asset = "USDC";

  const targetApr = p.pcts.find((x) => x > 0 && x < 80);
  const risk = job.risk;
  const lendShare = risk === "high" ? 45 : risk === "low" ? 75 : 60;
  const farmShare = Math.max(10, 100 - lendShare - 10);
  const dry = 10;
  const topApr =
    risk === "high" ? "10–18%" : risk === "low" ? "4–8%" : "7–14%";
  const gas = gasHint ?? Math.min(4, Math.max(1.5, capital * 0.002));

  return {
    title: `Yield route · ${asset} on BSC`,
    summary: `YieldRouter ranked ${asset} venues under risk=${risk}. Recommended barbell: ${lendShare}% liquid lending · ${farmShare}% PCS/farm sleeve · ${dry}% dry powder. Target band ${topApr} risk-adjusted on ~$${capital.toLocaleString()} notional. Gas ≲ $${gas.toFixed(2)}. Confidence ${confidence}/100.`,
    sections: [
      {
        heading: "Brief intake",
        body: table([
          ["Task", job.task],
          ["Asset (resolved)", asset],
          ["Notional", `$${capital.toLocaleString()}`],
          [
            "Target APR (if stated)",
            targetApr != null
              ? `${targetApr}%`
              : "not specified — optimize risk-adj",
          ],
          ["Risk", risk],
          ["Gas cap", `$${gas.toFixed(2)}`],
        ]),
      },
      {
        heading: "Venue ranking (risk-adjusted)",
        body: table([
          [
            "#1 Liquid lending",
            "Venus / blue-chip supply — exit anytime, moderate APR",
          ],
          [
            "#2 PCS farm / gauge",
            "Only if pair IL accepted; prefer deep stables or majors",
          ],
          [
            "#3 LST / restake path",
            "Optional sleeve if you accept smart-contract stack risk",
          ],
          [
            "Avoid",
            "Unverified farms, <24h old pools, opaque points-only APRs",
          ],
        ]),
      },
      {
        heading: "Allocation plan",
        body: table([
          ["Lending", `${lendShare}% (≈ $${((capital * lendShare) / 100).toFixed(0)})`],
          [
            "Farm / PCS-related",
            `${farmShare}% (≈ $${((capital * farmShare) / 100).toFixed(0)})`,
          ],
          ["Dry powder", `${dry}% (≈ $${((capital * dry) / 100).toFixed(0)})`],
          [
            "Rebalance trigger",
            "Top venue APR compresses >30% relative or TVL −40%",
          ],
          ["Horizon", "Review in 48h, full re-rank in 7d"],
        ]),
      },
      {
        heading: "Execution checklist",
        body: checklist([
          `Confirm live supply APR for ${asset} on your chosen lender`,
          `Size ${lendShare}% of $${capital.toLocaleString()} into lending first (safest leg)`,
          `If farm sleeve: prefer PCS pools with deep liquidity; set IL mental stop`,
          `Keep gas budget ≤ $${gas.toFixed(2)}; batch approvals`,
          "Screenshot starting balances for later PnL",
        ]),
      },
      {
        heading: "PancakeSwap note",
        body: "When PCS farm clears risk-adjusted hurdles vs pure lending, use it as the satellite sleeve — not the core. IL can erase APR quickly on volatile pairs.",
      },
      {
        heading: "Risks",
        body: table([
          ["Smart contract", "Prefer audited, high-TVL venues"],
          ["IL", "Farms with non-stable pairs"],
          ["Liquidity", "Exit path must work under stress"],
          ["Custody", "Agent never moves funds — you execute"],
        ]),
      },
    ],
    metrics: [
      { label: "Asset", value: asset },
      { label: "Notional", value: `$${capital.toLocaleString()}` },
      { label: "Risk-adj APR", value: topApr },
      { label: "Split", value: `${lendShare}/${farmShare}/${dry}` },
      { label: "Re-check", value: "48h" },
      { label: "Gas cap", value: `$${gas.toFixed(2)}` },
      { label: "Confidence", value: `${confidence}/100` },
      { label: "Agent", value: name },
    ],
    disclaimer:
      "YieldRouter plan uses illustrative rankings. Verify live APRs and TVL before depositing. Not financial advice.",
  };
}

function expertHealth(
  job: HireJob,
  g: GenesisAgent | undefined,
  p: ParsedBrief,
  name: string,
  confidence: number,
  capital: number,
): HireDeliverable {
  const protocol = p.protocol || "Venus / Aave-style on BSC";
  const shock =
    Math.abs(
      p.pcts.find((x) => x < 0) ??
        p.pcts.find((x) => x > 0 && x <= 40) ??
        15,
    ) || 15;
  const shockAbs = Math.abs(shock);
  const hfM = job.task.match(
    /\b(?:hf|health\s*factor)\s*[≈=~:]?\s*(\d+(?:\.\d+)?)/i,
  );
  const aboutHf = job.task.match(
    /\b(?:hf|health\s*factor)\s+(?:about|approx|~|≈)?\s*(\d+(?:\.\d+)?)/i,
  );
  const baseline = hfM
    ? Number(hfM[1])
    : aboutHf
      ? Number(aboutHf[1])
      : 1.45;
  const hf10 = +(baseline * (1 - 0.1 * 0.85)).toFixed(2);
  const hfShock = +(baseline * (1 - (shockAbs / 100) * 0.9)).toFixed(2);
  const hf20 = +(baseline * (1 - 0.2 * 0.9)).toFixed(2);
  const soft = 1.3;
  const hard = 1.2;
  const critical = 1.1;
  const action =
    hfShock < hard
      ? "Partial repay (priority) + optional collateral top-up"
      : hfShock < soft
        ? "Prepare repay; add collateral if debt illiquid"
        : "Monitor; pre-stage repay path";

  return {
    title: `Health factor plan · ${protocol}`,
    summary: `HealthSentinel modeled baseline HF ≈ ${baseline.toFixed(2)}. Under a −${shockAbs}% collateral shock, projected HF ≈ ${hfShock.toFixed(2)}. ${action}. Soft alert ${soft} · hard ${hard}. Confidence ${confidence}/100.`,
    sections: [
      {
        heading: "Brief intake",
        body: table([
          ["Task", job.task],
          ["Protocol frame", protocol],
          ["Baseline HF (resolved)", baseline.toFixed(2)],
          ["Primary shock", `−${shockAbs}% collateral`],
          ["Emergency buffer context", `~$${Math.min(capital, 500)}`],
        ]),
      },
      {
        heading: "Shock table",
        body: table([
          ["Collateral −10%", `HF ≈ ${hf10.toFixed(2)}`],
          [
            `Collateral −${shockAbs}% (requested)`,
            `HF ≈ ${hfShock.toFixed(2)}`,
          ],
          ["Collateral −20%", `HF ≈ ${hf20.toFixed(2)}`],
          [
            "Model note",
            "Linearized collateral sensitivity — verify live UI",
          ],
        ]),
      },
      {
        heading: "Alert thresholds",
        body: table([
          ["Soft alert", `HF ≤ ${soft} — notify & stage repay`],
          ["Hard alert", `HF ≤ ${hard} — act same session`],
          ["Critical", `HF ≤ ${critical} — repay first, questions later`],
        ]),
      },
      {
        heading: "Action ladder (priority order)",
        body: checklist([
          "Repay highest-rate debt first if wallet has liquid stables",
          "Else add strongest collateral (stable or blue-chip) to restore HF > soft",
          "Avoid opening new borrow until HF > 1.40 after shock recovery",
          "Enable protocol / bot alerts at soft and hard thresholds",
          "Never grant the agent repayment authority — you sign txs",
        ]),
      },
      {
        heading: "Sizing hint",
        body: `If HF is near hard after −${shockAbs}%, a repay of roughly ${(8 + shockAbs / 2).toFixed(0)}–${(15 + shockAbs).toFixed(0)}% of debt often restores a full soft buffer (order-of-magnitude; compute exact on protocol UI). Keep a small gas/stable buffer offline for emergencies.`,
      },
      {
        heading: "Security notes",
        body: table([
          ["Phishing", "Bookmark official Venus/Aave-style UIs only"],
          ["Approvals", "Revoke stale spend allowances monthly"],
          ["Custody", "HealthSentinel is advisory — no key access"],
        ]),
      },
    ],
    metrics: [
      { label: "Baseline HF", value: baseline.toFixed(2) },
      { label: `HF @ −${shockAbs}%`, value: hfShock.toFixed(2) },
      { label: "Soft / hard", value: `${soft} / ${hard}` },
      { label: "Primary action", value: action.split(" ")[0] + "…" },
      { label: "Confidence", value: `${confidence}/100` },
      { label: "Agent", value: name },
    ],
    disclaimer:
      "HealthSentinel simulation from your brief parameters. Always confirm live HF in the protocol UI before acting. Not financial advice.",
  };
}

function expertGeneric(
  job: HireJob,
  g: GenesisAgent | undefined,
  p: ParsedBrief,
  name: string,
  confidence: number,
  capital: number,
): HireDeliverable {
  return {
    title: `Structured brief · ${name}`,
    summary: `${name} produced an actionable plan for your task with confidence ${confidence}/100. No funds moved.`,
    sections: [
      { heading: "Task", body: job.task },
      {
        heading: "Understanding",
        body: `Keywords: ${p.keywords.slice(0, 12).join(", ") || "general"}. Notional context $${capital}. Risk ${job.risk}.`,
      },
      {
        heading: "Recommended approach",
        body: checklist([
          "Clarify success metric (PnL, APR, HF, time saved)",
          "Gather on-chain positions / screenshots",
          "Re-hire a category specialist with pair, %, and budget in the brief",
          "Execute only through your own wallet",
        ]),
      },
      {
        heading: "Next hire tip",
        body: "Include pair (e.g. CAKE/USDT), percentages, and protocol names for higher confidence specialist output.",
      },
    ],
    metrics: [
      { label: "Confidence", value: `${confidence}/100` },
      { label: "Agent", value: name },
      { label: "Notional ctx", value: `$${capital}` },
    ],
    disclaimer:
      "General brief. Prefer a category specialist for production plans.",
  };
}
