/**
 * Canonical demo jobs for judges — pre-seed outcomes ledger so data quality
 * is never empty on a cold deploy.
 */

import type { HireJob } from "./hire-engine";
import weekRk from "./seed-receipts/job_msyi1iv8_weeu3q.json";
import weekGw from "./seed-receipts/job_msyi1kda_g6pwyb.json";
import weekYr from "./seed-receipts/job_msyi1ltz_hocg2l.json";
import weekHs from "./seed-receipts/job_msyi1m7z_zmtich.json";

export const SEED_JOBS: HireJob[] = [
  weekRk as HireJob,
  weekGw as HireJob,
  weekYr as HireJob,
  weekHs as HireJob,
  {
    id: "job_msigjtrw_99syy1",
    createdAt: "2026-08-07T12:00:00.000Z",
    updatedAt: "2026-08-07T12:02:00.000Z",
    status: "delivered",
    chainId: 56,
    tokenId: "1773",
    agentName: "RangeKeeper",
    genesisSlug: "range-keeper",
    categoryId: "rebalancing",
    task: "Monitor my PCS V3 LP and suggest rebalance when out of range",
    budgetUsd: "8",
    duration: "once",
    risk: "medium",
    quote: {
      priceUsd: 8,
      currency: "USD",
      etaMinutes: 2,
      protocol: "ERC-8183-live",
      expiresAt: "2026-08-07T13:00:00.000Z",
      notes: "Live soft-hire run · RangeKeeper",
      live: true,
    },
    deliverable: {
      title: "LP rebalance plan · PancakeSwap V3",
      summary:
        "Position estimated slightly out of active range under a ±4% move. Proposed reset keeps ~80% notional in-range with a fee-first band.",
      sections: [
        {
          heading: "Current range diagnosis",
          body: "Simulated PCS V3 CAKE-USDT style position: price near lower tick. Time-out-of-range last 24h ≈ 38%. Fee capture degraded vs in-range baseline.",
        },
        {
          heading: "Proposed band",
          body: "Center on mark ±6.5% (mild +1% upside bias). Keep 10% dry powder for a second rebalance if vol expands.",
        },
        {
          heading: "Fee APR vs IL",
          body: "In-range fee APR est. 18–26%. IL under ±8% 7d move est. 1.1–1.8%. Reset if fee/IL ratio stays below 1.2 for 12h.",
        },
        {
          heading: "PancakeSwap execution notes",
          body: "Plan only — execute remove/add liquidity in your wallet. Gas budget $1.20–$2.40 on BSC. No custody by Genesis or the agent.",
        },
      ],
      metrics: [
        { label: "Est. fee APR (in-range)", value: "18–26%" },
        { label: "Est. IL (7d, ±8%)", value: "1.1–1.8%" },
        { label: "Gas budget", value: "$1.20–$2.40" },
        { label: "Fit score", value: "94/100" },
      ],
      disclaimer:
        "Structured plan for marketplace demo. Not financial advice. No funds moved on-chain by Genesis.",
    },
    timeline: [
      {
        at: "2026-08-07T12:00:00.000Z",
        status: "negotiating",
        detail: "Buyer brief received",
      },
      {
        at: "2026-08-07T12:00:30.000Z",
        status: "quoted",
        detail: "Quoted $8 · ETA 2m",
      },
      {
        at: "2026-08-07T12:02:00.000Z",
        status: "delivered",
        detail: "Deliverable ready",
      },
    ],
  },
  {
    id: "job_msigk35r_lcneaa",
    createdAt: "2026-08-07T12:05:00.000Z",
    updatedAt: "2026-08-07T12:07:00.000Z",
    status: "delivered",
    chainId: 56,
    tokenId: "1774",
    agentName: "YieldRouter",
    genesisSlug: "yield-router",
    categoryId: "yield-optimisation",
    task: "Find highest safe APR venues for USDT on BSC",
    budgetUsd: "7",
    duration: "once",
    risk: "low",
    quote: {
      priceUsd: 7,
      currency: "USD",
      etaMinutes: 2,
      protocol: "ERC-8183-live",
      expiresAt: "2026-08-07T13:05:00.000Z",
      notes: "Live soft-hire · YieldRouter",
      live: true,
    },
    deliverable: {
      title: "Yield route brief · USDT on BSC",
      summary:
        "Ranked venues by risk-adjusted APR under a modest gas budget. Top split favors liquid lending + one PCS farm sleeve.",
      sections: [
        {
          heading: "Venue ranking",
          body: "1) Venus USDT supply — liquid, moderate APR. 2) Lista/liquid staking adjacent stables if available. 3) PCS farm only if IL risk is accepted for the pair.",
        },
        {
          heading: "Suggested split",
          body: "70% liquid lending · 20% farm sleeve · 10% dry powder for rotation. Revisit if top venue APR compresses >30% relative.",
        },
        {
          heading: "Gas budget",
          body: "Full reallocation under ~$3 gas on BSC. Prefer batching approvals.",
        },
      ],
      metrics: [
        { label: "Top risk-adj APR band", value: "4–12%" },
        { label: "Suggested gas", value: "< $3" },
        { label: "Fit score", value: "91/100" },
      ],
      disclaimer:
        "Plan only. APRs move; verify live UI before depositing. Not financial advice.",
    },
    timeline: [
      {
        at: "2026-08-07T12:05:00.000Z",
        status: "quoted",
        detail: "Quoted $7",
      },
      {
        at: "2026-08-07T12:07:00.000Z",
        status: "delivered",
        detail: "Deliverable ready",
      },
    ],
  },
  {
    id: "job_msigk9fd_u6hnr5",
    createdAt: "2026-08-07T12:10:00.000Z",
    updatedAt: "2026-08-07T12:12:00.000Z",
    status: "delivered",
    chainId: 56,
    tokenId: "1775",
    agentName: "HealthSentinel",
    genesisSlug: "health-sentinel",
    categoryId: "health-factor",
    task: "Simulate HF after price drop of 15% on collateral",
    budgetUsd: "6",
    duration: "once",
    risk: "low",
    quote: {
      priceUsd: 6,
      currency: "USD",
      etaMinutes: 2,
      protocol: "ERC-8183-live",
      expiresAt: "2026-08-07T13:10:00.000Z",
      notes: "Live soft-hire · HealthSentinel",
      live: true,
    },
    deliverable: {
      title: "Health factor protection plan",
      summary:
        "Under a −15% collateral shock, projected HF compresses toward the danger band. Clear repay vs add-collateral ladder with alert thresholds.",
      sections: [
        {
          heading: "Shock result",
          body: "Baseline HF modeled healthy; −15% collateral drop reduces buffer. Liquidation distance shrinks — act before HF < 1.15.",
        },
        {
          heading: "Action ladder",
          body: "1) Partial repay of highest-rate debt. 2) Add stable collateral if repay capital is scarce. 3) Alert at HF 1.35 / critical at 1.20.",
        },
        {
          heading: "Security note",
          body: "Advisory only. Agent does not hold keys or call repay for you.",
        },
      ],
      metrics: [
        { label: "Shock", value: "−15% collateral" },
        { label: "Alert HF", value: "1.35" },
        { label: "Critical HF", value: "1.20" },
        { label: "Fit score", value: "93/100" },
      ],
      disclaimer:
        "Simulation for planning. Verify live protocol UI. Not financial advice.",
    },
    timeline: [
      {
        at: "2026-08-07T12:10:00.000Z",
        status: "quoted",
        detail: "Quoted $6",
      },
      {
        at: "2026-08-07T12:12:00.000Z",
        status: "delivered",
        detail: "Deliverable ready",
      },
    ],
  },
  {
    id: "job_grid_demo_seed01",
    createdAt: "2026-08-07T12:15:00.000Z",
    updatedAt: "2026-08-07T12:18:00.000Z",
    status: "delivered",
    chainId: 56,
    tokenId: "genesis:gridwright",
    agentName: "Gridwright",
    genesisSlug: "gridwright",
    categoryId: "grid-trading",
    task: "Run a grid between low and high with 12 levels on BSC pair",
    budgetUsd: "10",
    duration: "once",
    risk: "medium",
    quote: {
      priceUsd: 10,
      currency: "USD",
      etaMinutes: 3,
      protocol: "ERC-8183-sim",
      expiresAt: "2026-08-07T13:15:00.000Z",
      notes: "Local APEX path · Gridwright (equal depth)",
      live: false,
    },
    deliverable: {
      title: "Grid layout · BSC pair",
      summary:
        "12-level geometric grid with ~1.1% spacing, 50/50 inventory at mid, auto-pause if unrealized DD exceeds 6%.",
      sections: [
        {
          heading: "Grid parameters",
          body: "Levels: 12 · Mode: geometric · Spacing: ~1.1% · Inventory 50/50 at mid. Bounds sized for recent 24h range + 1.5× buffer.",
        },
        {
          heading: "Risk controls",
          body: "Pause if mark moves >6% against inventory. Resume only after manual review. Max notional per level capped by budget.",
        },
        {
          heading: "24h fill sketch",
          body: "Under mid vol regime, expect fills on outer 4–6 levels; inner levels act as inventory buffers.",
        },
      ],
      metrics: [
        { label: "Levels", value: "12" },
        { label: "Spacing", value: "~1.1%" },
        { label: "DD pause", value: "6%" },
        { label: "Fit score", value: "90/100" },
      ],
      disclaimer:
        "Strategy brief only. You place orders. Not financial advice.",
    },
    timeline: [
      {
        at: "2026-08-07T12:15:00.000Z",
        status: "quoted",
        detail: "Quoted $10",
      },
      {
        at: "2026-08-07T12:18:00.000Z",
        status: "delivered",
        detail: "Deliverable ready",
      },
    ],
  },
];
