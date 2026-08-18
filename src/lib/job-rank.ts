/**
 * Eligibility-gated job rank.
 *
 * Eligible first. Unsafe / wrong job type is not "#3".
 * Points come from job fit + receipt axes — not stars, not paid slots.
 * Genesis specialists stay hireable even when they are not organic for this brief.
 */

import type { CategoryId } from "./categories";
import { getCategory } from "./categories";
import {
  allGenesisAgents,
  genesisBuyHref,
  genesisHref,
  type GenesisAgent,
} from "./genesis-agents";
import { admitSeller, type AdmissionReport } from "./admission";
import { identityFromGenesis, type SellerIdentity } from "./seller-identity";
import type { ReceiptAxisId, ReceiptScorecard } from "./receipt-score";
import { detectCategory, JOB_CHIPS } from "./job-chips";
import { coolingPenalty, type SellerIncident } from "./job-decision";

export const JOB_RANK_SUITE = "job-rank-v1";

export type Eligibility = {
  eligible: boolean;
  hireable: true;
  blockers: string[];
  notes: string[];
};

export type RankedListing = {
  slug: string;
  name: string;
  categoryId: CategoryId;
  href: string;
  buyHref: string;
  hireable: true;
  eligible: boolean;
  organic: true;
  organicRank: number | null;
  points: number;
  fit: number;
  receipt: number | null;
  why: string[];
  blockers: string[];
  controller: string | null;
};

export type JobRankResult = {
  suiteId: typeof JOB_RANK_SUITE;
  task: string;
  categoryId: CategoryId | null;
  categoryName: string | null;
  organic: RankedListing[];
  excluded: RankedListing[];
  paidRank: false;
};

export const JOB_AXIS_WEIGHT: Record<
  CategoryId,
  Record<ReceiptAxisId, number>
> = {
  rebalancing: {
    reliability: 0.2,
    correctness: 0.3,
    safety: 0.25,
    honesty: 0.15,
    freshness: 0.1,
  },
  "grid-trading": {
    reliability: 0.3,
    correctness: 0.25,
    safety: 0.2,
    honesty: 0.15,
    freshness: 0.1,
  },
  "yield-optimisation": {
    reliability: 0.15,
    correctness: 0.3,
    safety: 0.2,
    honesty: 0.25,
    freshness: 0.1,
  },
  "health-factor": {
    reliability: 0.2,
    correctness: 0.2,
    safety: 0.4,
    honesty: 0.15,
    freshness: 0.05,
  },
};

export function specialistEligibility(
  agent: GenesisAgent,
  jobCategoryId: CategoryId | null,
  admission?: AdmissionReport,
  identity?: SellerIdentity,
): Eligibility {
  const id = identity ?? identityFromGenesis(agent);
  const adm = admission ?? admitSeller(agent);
  const blockers: string[] = [];
  const notes: string[] = [];

  if (!id.erc8004 || !id.controller) {
    blockers.push("Identity is not bound (ERC-8004 + controller)");
  }
  if (id.mandate.mayMoveFunds || id.mandate.custody) {
    blockers.push("Mandate allows custody or fund movement");
  }
  const inj = adm.checks.find((c) => c.id === "injection");
  const man = adm.checks.find((c) => c.id === "mandate");
  if (inj && !inj.ok) blockers.push("Failed injection holdout");
  if (man && !man.ok) blockers.push("Failed mandate check");

  if (jobCategoryId && agent.categoryId !== jobCategoryId) {
    blockers.push(
      `Wrong job type — this specialist is for ${getCategory(agent.categoryId)?.shortName || agent.categoryId}`,
    );
  }

  if (blockers.length === 0) {
    notes.push("Identity + mandate + injection hold");
    if (jobCategoryId && agent.categoryId === jobCategoryId) {
      notes.push(`Specialist for ${getCategory(jobCategoryId)?.shortName}`);
    }
  }

  return {
    eligible: blockers.length === 0,
    hireable: true,
    blockers,
    notes,
  };
}

export function jobFitScore(
  agent: GenesisAgent,
  jobCategoryId: CategoryId | null,
): number {
  if (!jobCategoryId) return 40;
  if (agent.categoryId === jobCategoryId) return 100;
  return 20;
}

export function receiptPointsForJob(
  card: ReceiptScorecard | undefined,
  jobCategoryId: CategoryId | null,
): number | null {
  if (!card) return null;
  const weights =
    (jobCategoryId && JOB_AXIS_WEIGHT[jobCategoryId]) ||
    JOB_AXIS_WEIGHT.rebalancing;
  let sum = 0;
  let wsum = 0;
  for (const ax of card.axes) {
    if (ax.absent) continue;
    const w = weights[ax.id] ?? 0;
    sum += ax.value * w;
    wsum += w;
  }
  if (wsum <= 0) return card.composite;
  return Math.round((sum / wsum) * 10) / 10;
}

function applyClonePenalty(rows: RankedListing[]): RankedListing[] {
  const seen = new Set<string>();
  const out: RankedListing[] = [];
  for (const row of rows) {
    const key = row.controller || row.slug;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function rankGenesisForJob(
  rawTask: string,
  scorecards?: ReceiptScorecard[],
  limit?: number,
  incidents?: SellerIncident[],
): JobRankResult {
  const task = rawTask.trim();
  const categoryId = detectCategory(task);
  const cards = new Map((scorecards || []).map((c) => [c.slug, c]));

  const chip = JOB_CHIPS.find(
    (c) =>
      c.label.toLowerCase() === task.toLowerCase() ||
      c.task.toLowerCase() === task.toLowerCase(),
  );
  const normalized =
    chip?.task ||
    task ||
    (categoryId
      ? JOB_CHIPS.find((c) => c.categoryId === categoryId)?.task || task
      : task);

  const listings: RankedListing[] = allGenesisAgents().map((agent) => {
    const admission = admitSeller(agent);
    const identity = identityFromGenesis(agent);
    const elig = specialistEligibility(
      agent,
      categoryId,
      admission,
      identity,
    );
    const fit = jobFitScore(agent, categoryId);
    const card = cards.get(agent.slug);
    const receipt = receiptPointsForJob(card, categoryId);
    const quality =
      receipt ?? (admission.grade === "admitted" ? 70 : 50);
    const cool = coolingPenalty(
      (incidents || []).filter(
        (i) => i.genesisSlug === agent.slug || i.sellerId === identity.sellerId,
      ),
      identity.version,
    );
    const points = Math.round(
      (fit * 0.45 + quality * 0.55) * (1 - cool.penalty),
    );
    const why: string[] = [];
    if (elig.eligible) {
      why.push(...elig.notes);
      if (receipt != null) {
        why.push(`Receipt ${receipt} for this job type`);
      }
      if (categoryId === "health-factor") {
        why.push("Safety weighted for this job type");
      }
      if (cool.penalty > 0) why.push(...cool.why);
      why.push("Organic slot · no paid rank");
    }

    return {
      slug: agent.slug,
      name: agent.name,
      categoryId: agent.categoryId,
      href: genesisHref(agent),
      buyHref: genesisBuyHref(agent, { task: normalized, buy: true }),
      hireable: true,
      eligible: elig.eligible,
      organic: true as const,
      organicRank: null,
      points,
      fit,
      receipt: receipt ?? null,
      why,
      blockers: elig.blockers,
      controller: identity.controller,
    };
  });

  const eligible = applyClonePenalty(
    listings.filter((l) => l.eligible).sort((a, b) => b.points - a.points),
  ).map((l, i) => ({ ...l, organicRank: i + 1 }));

  const excluded = listings
    .filter((l) => !l.eligible)
    .map((l) => ({ ...l, organicRank: null, points: -Infinity }));

  return {
    suiteId: JOB_RANK_SUITE,
    task: normalized,
    categoryId,
    categoryName: categoryId ? getCategory(categoryId)?.name || null : null,
    organic: typeof limit === "number" ? eligible.slice(0, limit) : eligible,
    excluded,
    paidRank: false,
  };
}

export function listingToMatchShape(row: RankedListing, task: string) {
  const agent = allGenesisAgents().find((a) => a.slug === row.slug)!;
  return {
    agent,
    href: row.href,
    buyHref: row.buyHref || genesisBuyHref(agent, { task, buy: true }),
    score: Number.isFinite(row.points) ? row.points : 0,
    reasons: row.eligible ? row.why : row.blockers,
    categoryId: row.categoryId,
    categoryName: getCategory(row.categoryId)?.name || row.categoryId,
    eligible: row.eligible,
    hireable: row.hireable,
    organicRank: row.organicRank,
  };
}
