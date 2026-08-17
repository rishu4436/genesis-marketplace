/**
 * Buyer context — inspired by UOMP Guard in stockanalyst-agent-demo.
 * Local profile: DeFi holdings + risk so specialists personalize reports.
 */

export type BuyerRisk = "conservative" | "moderate" | "aggressive";
export type BuyerHorizon = "7d" | "30d" | "90d" | "12mo";

export type BuyerPosition = {
  id: string;
  kind: "lp" | "lend" | "borrow" | "spot" | "farm";
  label: string;
  protocol?: string;
  pairOrAsset: string;
  notionalUsd: number;
  /** optional cost basis for PnL-style notes */
  costBasisUsd?: number;
  notes?: string;
};

export type BuyerContext = {
  version: 1;
  displayName?: string;
  risk: BuyerRisk;
  horizon: BuyerHorizon;
  positions: BuyerPosition[];
  updatedAt: string;
};

export const BUYER_CONTEXT_KEY = "genesis-buyer-context";

export function defaultBuyerContext(): BuyerContext {
  return {
    version: 1,
    displayName: "Demo buyer",
    risk: "moderate",
    horizon: "30d",
    updatedAt: new Date().toISOString(),
    positions: [
      {
        id: "p1",
        kind: "lp",
        label: "PCS V3 concentrated LP",
        protocol: "PancakeSwap",
        pairOrAsset: "CAKE-USDT",
        notionalUsd: 4200,
        costBasisUsd: 4000,
        notes: "Often near range edge",
      },
      {
        id: "p2",
        kind: "lend",
        label: "Stable supply",
        protocol: "Venus",
        pairOrAsset: "USDT",
        notionalUsd: 2500,
        costBasisUsd: 2500,
      },
      {
        id: "p3",
        kind: "borrow",
        label: "Collateralized debt",
        protocol: "Venus",
        pairOrAsset: "BNB collat / USDT debt",
        notionalUsd: 800,
        notes: "Watch HF under vol",
      },
    ],
  };
}

export function loadBuyerContext(): BuyerContext {
  if (typeof window === "undefined") return defaultBuyerContext();
  try {
    const raw = localStorage.getItem(BUYER_CONTEXT_KEY);
    if (!raw) return defaultBuyerContext();
    const parsed = JSON.parse(raw) as BuyerContext;
    if (!parsed?.positions) return defaultBuyerContext();
    return parsed;
  } catch {
    return defaultBuyerContext();
  }
}

export function saveBuyerContext(ctx: BuyerContext) {
  if (typeof window === "undefined") return;
  const next = { ...ctx, updatedAt: new Date().toISOString() };
  localStorage.setItem(BUYER_CONTEXT_KEY, JSON.stringify(next));
  return next;
}

export function summarizeBuyerContext(ctx: BuyerContext): string {
  const total = ctx.positions.reduce((s, p) => s + (p.notionalUsd || 0), 0);
  const lines = ctx.positions.map(
    (p) =>
      `${p.kind.toUpperCase()} ${p.pairOrAsset} ~$${p.notionalUsd}${
        p.protocol ? ` @ ${p.protocol}` : ""
      }${p.notes ? ` (${p.notes})` : ""}`,
  );
  return [
    `Risk=${ctx.risk} · Horizon=${ctx.horizon} · Gross notional ~$${total}`,
    ...lines,
  ].join("\n");
}

export function positionsForCategory(
  ctx: BuyerContext,
  categoryId?: string | null,
): BuyerPosition[] {
  if (!categoryId) return ctx.positions;
  switch (categoryId) {
    case "rebalancing":
      return ctx.positions.filter((p) => p.kind === "lp" || p.kind === "farm");
    case "yield-optimisation":
      return ctx.positions.filter(
        (p) => p.kind === "lend" || p.kind === "farm" || p.kind === "spot",
      );
    case "health-factor":
      return ctx.positions.filter((p) => p.kind === "borrow" || p.kind === "lend");
    case "grid-trading":
      return ctx.positions.filter((p) => p.kind === "spot" || p.kind === "lp");
    default:
      return ctx.positions;
  }
}
