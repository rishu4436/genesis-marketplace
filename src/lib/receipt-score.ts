/**
 * Receipt score vector — outcomes, not stars.
 *
 * Economic quality is absent until fills can be compared to a benchmark.
 * Holdout jobs do not inflate reliability. Ranking is unchanged (Phase 5).
 */

import type { HireJob } from "./hire-engine";
import { listJobs } from "./job-store";
import { deliverableSchemaValid, verifyJobReceipt } from "./job-receipt";
import { admitSeller } from "./admission";
import {
  allGenesisAgents,
  getGenesisAgent,
  type GenesisAgent,
} from "./genesis-agents";
import { identityFromGenesis } from "./seller-identity";
import { MARKETPLACE_MANDATE_ID } from "./job-spec";
import { holdoutForCategory } from "./holdout-book";
import { needleHits } from "./admission";

export const RECEIPT_SCORE_SUITE = "receipt-score-v1";
export const SCORE_PRIOR_N = 4;
export const SCORE_PRIOR_P = 0.55;
export const SCORE_HALF_LIFE_DAYS = 21;

export type ReceiptAxisId =
  | "reliability"
  | "correctness"
  | "safety"
  | "honesty"
  | "freshness";

export type ReceiptAxis = {
  id: ReceiptAxisId;
  label: string;
  short: string;
  value: number;
  source: string;
  absent?: boolean;
};

export type ReceiptScorecard = {
  suiteId: typeof RECEIPT_SCORE_SUITE;
  slug: string;
  name: string;
  sellerId: string;
  version: string;
  sampleSize: number;
  axes: ReceiptAxis[];
  composite: number;
  hireable: true;
  absent: string[];
  evaluatedAt: string;
};

const AXIS_WEIGHT: Record<ReceiptAxisId, number> = {
  reliability: 0.25,
  correctness: 0.25,
  safety: 0.25,
  honesty: 0.15,
  freshness: 0.1,
};

export function shrinkRate(
  successes: number,
  n: number,
  priorP = SCORE_PRIOR_P,
  priorN = SCORE_PRIOR_N,
): number {
  if (!Number.isFinite(successes) || !Number.isFinite(n) || n < 0) return priorP * 100;
  const p = (Math.max(0, successes) + priorP * priorN) / (Math.max(0, n) + priorN);
  return Math.round(Math.max(0, Math.min(1, p)) * 1000) / 10;
}

export function weightedShrink(
  items: { ok: boolean; weight: number }[],
  priorP = SCORE_PRIOR_P,
  priorN = SCORE_PRIOR_N,
): number {
  const wSum = items.reduce((s, i) => s + i.weight, 0);
  const okSum = items.reduce((s, i) => s + (i.ok ? i.weight : 0), 0);
  return shrinkRate(okSum, wSum, priorP, priorN);
}

function versionOf(job: HireJob): string | null {
  return job.receipt?.sellerVersion || job.spec?.seller.identityVersion || null;
}

export function versionWeight(job: HireJob, currentVersion: string): number {
  const v = versionOf(job);
  if (!v) return 0.5;
  if (v === currentVersion) return 1;
  return 0.25;
}

export function jobsForSeller(jobs: HireJob[], slug: string): HireJob[] {
  return jobs.filter(
    (j) => j.genesisSlug === slug && j.purpose !== "holdout",
  );
}

function jobTimeMs(job: HireJob): number {
  const stamps = [
    job.updatedAt,
    job.createdAt,
    job.receipt?.timestamps?.deliveredAt,
    job.receipt?.timestamps?.sealedAt,
  ];
  let max = 0;
  for (const s of stamps) {
    const t = s ? Date.parse(s) : NaN;
    if (Number.isFinite(t) && t > max) max = t;
  }
  return max;
}

function jobBlob(job: HireJob): string {
  const d = job.deliverable;
  if (!d) return "";
  return [
    d.title,
    d.summary,
    ...d.sections.map((s) => `${s.heading} ${s.body}`),
    ...(d.metrics || []).map((m) => `${m.label} ${m.value}`),
  ].join("\n");
}

/** Per-seller evidence so four specialists do not share one stamp score. */
export function mandateEvidence(
  agent: GenesisAgent,
  jobs: HireJob[],
): { value: number; source: string } {
  const hold = holdoutForCategory(agent.categoryId);
  const delivered = jobs.filter((j) => j.status === "delivered");
  const blob = delivered.map(jobBlob).join("\n");
  const hits = needleHits(blob, hold.needles);
  const rate = hold.needles.length ? hits.length / hold.needles.length : 0;
  const sections = new Set(
    delivered.flatMap((j) => j.deliverable?.sections.map((s) => s.heading) || []),
  ).size;
  const metrics = delivered.reduce(
    (n, j) => n + (j.deliverable?.metrics?.length || 0),
    0,
  );
  const onchain = /slot0|eth_call|tick -?\d+|supply apr/i.test(blob);
  const categoryBar: Record<string, number> = {
    rebalancing: onchain ? 18 : 11,
    "grid-trading": /spacing|drawdown|level/i.test(blob) ? 14 : 7,
    "yield-optimisation": /venus|\bapr\b|split/i.test(blob) ? 9 : 4,
    "health-factor":
      /\bhf\b|health factor|collateral/i.test(blob) ? 16 : 8,
  };
  const extra = categoryBar[agent.categoryId] ?? 0;
  const skillHits = agent.skills.filter((s) =>
    blob.toLowerCase().includes(s.split(/\s+/)[0]!.toLowerCase()),
  ).length;
  const raw =
    rate * 34 +
    Math.min(sections, 10) * 1.4 +
    Math.min(metrics, 8) * 0.9 +
    extra +
    skillHits * 2.2;
  const value = Math.round(Math.max(20, Math.min(96, raw)) * 10) / 10;
  return {
    value,
    source: `${hits.length}/${hold.needles.length} mandate needles · ${sections} sections${onchain ? " · on-chain reads" : ""}`,
  };
}

function mandateHolds(job: HireJob): boolean {
  const m = job.receipt?.mandate || job.spec?.mandate;
  if (!m) return false;
  return (
    m.custody === false &&
    m.mayMoveFunds === false &&
    m.output === "structured-plan" &&
    m.id === MARKETPLACE_MANDATE_ID
  );
}

function sessionSafe(job: HireJob): boolean {
  if (!job.session) return true;
  return (
    job.session.policy.mayMoveFunds === false &&
    job.session.policy.spend === "0" &&
    job.session.policy.custody === false
  );
}

function freshnessValue(jobs: HireJob[], currentVersion: string): ReceiptAxis {
  const delivered = jobs.filter((j) => j.status === "delivered");
  if (delivered.length === 0) {
    return {
      id: "freshness",
      label: "Freshness",
      short: "Fresh",
      value: 0,
      source: "No delivered receipt on this seller",
      absent: true,
    };
  }
  const latestMs = delivered.reduce((max, j) => {
    const t = jobTimeMs(j);
    return t > max ? t : max;
  }, 0);
  const ageDays = latestMs > 0 ? (Date.now() - latestMs) / 86_400_000 : 999;
  const recency =
    ageDays <= 2 ? 95 : ageDays <= 7 ? 82 : ageDays <= SCORE_HALF_LIFE_DAYS ? 62 : ageDays <= 45 ? 38 : 16;
  const onVer =
    delivered.filter((j) => versionOf(j) === currentVersion).length /
    delivered.length;
  const value = Math.round((recency * 0.7 + onVer * 100 * 0.3) * 10) / 10;
  return {
    id: "freshness",
    label: "Freshness",
    short: "Fresh",
    value,
    source: `last receipt ${Math.max(0, Math.round(ageDays))}d ago · ${(onVer * 100).toFixed(0)}% on ${currentVersion}`,
  };
}

export function scoreSellerFromJobs(
  agent: GenesisAgent,
  jobs: HireJob[],
): ReceiptScorecard {
  const identity = identityFromGenesis(agent);
  const mine = jobsForSeller(jobs, agent.slug);
  const terminal = mine.filter(
    (j) => j.status === "delivered" || j.status === "failed",
  );
  const admission = admitSeller(agent);

  const weighted = terminal.map((j) => ({
    job: j,
    weight: versionWeight(j, identity.version),
  }));

  const reliability = weightedShrink(
    weighted.map(({ job, weight }) => ({
      ok: job.status === "delivered" && job.isolation?.killed !== true,
      weight,
    })),
  );

  const schemaItems = weighted
    .filter(({ job }) => job.status === "delivered")
    .map(({ job, weight }) => ({
      ok:
        deliverableSchemaValid(job.deliverable) &&
        job.decision?.state !== "disputed",
      weight: job.decision?.state === "accepted" ? weight + 0.5 : weight,
    }));
  const schemaScore = weightedShrink(schemaItems);
  const evidence = mandateEvidence(agent, mine);
  const correctness =
    Math.round((schemaScore * 0.2 + evidence.value * 0.8) * 10) / 10;

  const safetyItems = weighted.map(({ job, weight }) => ({
    ok:
      mandateHolds(job) &&
      sessionSafe(job) &&
      sessionSafe(job),
    weight,
  }));
  if (admission.checks.find((c) => c.id === "injection")?.ok) {
    safetyItems.push({ ok: true, weight: 2 });
  }
  const safety = weightedShrink(safetyItems);

  const honestyItems = weighted
    .filter(({ job }) => job.status === "delivered")
    .map(({ job, weight }) => ({
      ok: verifyJobReceipt(job).ok && job.decision?.state !== "disputed",
      weight,
    }));
  const honesty = weightedShrink(honestyItems);

  const fresh = freshnessValue(mine, identity.version);

  const axes: ReceiptAxis[] = [
    {
      id: "reliability",
      label: "Reliability",
      short: "Rel",
      value: reliability,
      source: `${terminal.filter((j) => j.status === "delivered").length}/${terminal.length || 0} delivered · shrunk n+${SCORE_PRIOR_N}`,
    },
    {
      id: "correctness",
      label: "Correctness",
      short: "Corr",
      value: correctness,
      source: evidence.source,
    },
    {
      id: "safety",
      label: "Safety",
      short: "Safe",
      value: safety,
      source: "mandate · spend 0 · injection held",
    },
    {
      id: "honesty",
      label: "Honesty",
      short: "Hon",
      value: honesty,
      source: "receipt spec/output hash verify",
    },
    fresh,
  ];

  let sum = 0;
  let wsum = 0;
  for (const ax of axes) {
    if (ax.absent) continue;
    sum += ax.value * AXIS_WEIGHT[ax.id];
    wsum += AXIS_WEIGHT[ax.id];
  }
  const composite = wsum > 0 ? Math.round((sum / wsum) * 10) / 10 : 0;

  return {
    suiteId: RECEIPT_SCORE_SUITE,
    slug: agent.slug,
    name: agent.name,
    sellerId: identity.sellerId,
    version: identity.version,
    sampleSize: terminal.length,
    axes,
    composite,
    hireable: true,
    absent: [
      "economic — no fill vs benchmark on plan-only receipts",
    ],
    evaluatedAt: new Date().toISOString(),
  };
}

export async function scoreSeller(slug: string): Promise<ReceiptScorecard | null> {
  const agent = getGenesisAgent(slug);
  if (!agent) return null;
  const jobs = await listJobs(200);
  return scoreSellerFromJobs(agent, jobs);
}

export async function scoreAllSpecialists(): Promise<ReceiptScorecard[]> {
  const jobs = await listJobs(200);
  return allGenesisAgents().map((a) => scoreSellerFromJobs(a, jobs));
}

export function compositeFromReceiptAxes(axes: ReceiptAxis[]): number {
  let sum = 0;
  let wsum = 0;
  for (const ax of axes) {
    if (ax.absent) continue;
    sum += ax.value * (AXIS_WEIGHT[ax.id] ?? 0);
    wsum += AXIS_WEIGHT[ax.id] ?? 0;
  }
  if (wsum <= 0) return 0;
  return Math.round((sum / wsum) * 10) / 10;
}
