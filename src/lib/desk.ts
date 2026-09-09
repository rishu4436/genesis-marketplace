/**
 * Smart Money desk contract — job is the atom, not the agent listing.
 * Compose ERC-8004 / 8183 / x402. Do not fork them. Do not fake loops.
 */

import type { CategoryId } from "./categories";
import { CATEGORIES } from "./categories";
import type { ThirdPartySeller } from "./third-party-sellers";

export const DESK = {
  oneLiner: "The Smart Money desk for agents on BNB Smart Chain.",
  loop: "discover → compare → plan → escrow → prove → rank",
  northStar:
    "Completed escrowed jobs with payment-tied feedback per week — not agents listed, not pageviews.",
  wedge:
    "BNB already won registration. Genesis is the hire floor: job SKUs, receipts, optional ERC-8183 escrow.",
} as const;

export type DeskRailId = "L0" | "L2";

export const DESK_RAILS: Record<
  DeskRailId,
  { id: DeskRailId; name: string; short: string; meaning: string }
> = {
  L0: {
    id: "L0",
    name: "Plan",
    short: "Plan",
    meaning:
      "Get plan. Structured plan. You keep the keys. Free. The agent does not move funds.",
  },
  L2: {
    id: "L2",
    name: "Escrow",
    short: "Escrow",
    meaning:
      "Optional ERC-8183 on BSC mainnet. Not the default path — Get plan is.",
  },
};

export type JobSku = {
  categoryId: CategoryId;
  job: string;
  deliverableSchema: "structured-plan";
  proof: string;
  priceRail: DeskRailId;
  defaultSeller: string;
};

export const JOB_SKUS: JobSku[] = [
  {
    categoryId: "rebalancing",
    job: "Keep a PancakeSwap V3 LP in range",
    deliverableSchema: "structured-plan",
    proof: "Hashed receipt + live PCS V3 slot0",
    priceRail: "L0",
    defaultSeller: "range-keeper",
  },
  {
    categoryId: "grid-trading",
    job: "Lay a bounded grid on a BSC pair",
    deliverableSchema: "structured-plan",
    proof: "Hashed receipt + live BNB/USDT tick",
    priceRail: "L0",
    defaultSeller: "gridwright",
  },
  {
    categoryId: "yield-optimisation",
    job: "Route idle stables to a stronger measured APR",
    deliverableSchema: "structured-plan",
    proof: "Hashed receipt + Venus supplyRatePerBlock",
    priceRail: "L0",
    defaultSeller: "yield-router",
  },
  {
    categoryId: "health-factor",
    job: "Measure liquidation distance before a shock",
    deliverableSchema: "structured-plan",
    proof: "Hashed receipt + Venus rates; wallet HF when you pass an address",
    priceRail: "L0",
    defaultSeller: "health-sentinel",
  },
];

export function skuForCategory(id: CategoryId): JobSku | undefined {
  return JOB_SKUS.find((s) => s.categoryId === id);
}

export function skuJobLine(id: CategoryId): string {
  const sku = skuForCategory(id);
  const cat = CATEGORIES.find((c) => c.id === id);
  return sku?.job || cat?.tagline || id;
}

/** What a third-party hire can actually return. Quote-only is not Live. */
export function sellerPayloadKind(
  s: Pick<ThirdPartySeller, "restBase" | "exampleUrl">,
): "report" | "sample" | "quote" {
  if (s.restBase) return "report";
  if (s.exampleUrl) return "sample";
  return "quote";
}

export type TrustBadgeId = "live" | "plan-certified" | "bonded" | "insured";

export type TrustBadge = {
  id: TrustBadgeId;
  on: boolean;
  label: string;
  meaning: string;
};

export function genesisTrustBadges(opts: {
  healthHireable: boolean;
  admissionAdmitted: boolean;
}): TrustBadge[] {
  return [
    {
      id: "live",
      on: opts.healthHireable,
      label: "Live",
      meaning: "APEX heartbeat hireable — we operate this seller",
    },
    {
      id: "plan-certified",
      on: opts.admissionAdmitted,
      label: "Plan-certified",
      meaning: "Admission + holdout suite passed",
    },
    {
      id: "bonded",
      on: false,
      label: "Bonded",
      meaning: "Slashable stake — not offered yet",
    },
    {
      id: "insured",
      on: false,
      label: "Insured",
      meaning: "Underwriter — not offered yet",
    },
  ];
}

export function thirdPartyTrustBadges(kind: "report" | "sample" | "quote"): TrustBadge[] {
  return [
    {
      id: "live",
      on: kind !== "quote",
      label: "Live",
      meaning:
        kind === "report"
          ? "Operator API payload on hire"
          : kind === "sample"
            ? "Public measured sample on hire"
            : "A2A quote only — not a completed plan",
    },
    {
      id: "plan-certified",
      on: false,
      label: "Plan-certified",
      meaning: "Holdout suite is Genesis specialists only",
    },
    {
      id: "bonded",
      on: false,
      label: "Bonded",
      meaning: "Slashable stake — not offered yet",
    },
    {
      id: "insured",
      on: false,
      label: "Insured",
      meaning: "Underwriter — not offered yet",
    },
  ];
}
