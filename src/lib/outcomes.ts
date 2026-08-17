/**
 * Marketplace outcomes ledger — anonymized job stats (moat over raw 8004scan).
 */

import type { HireJob } from "./hire-engine";
import { listJobs } from "./job-store";

export type OutcomeSnapshot = {
  totalJobs: number;
  delivered: number;
  failed: number;
  successRate: number;
  avgEtaMinutes: number | null;
  avgPriceUsd: number | null;
  byCategory: { categoryId: string; count: number; delivered: number }[];
  byAgent: { name: string; slug?: string; count: number; delivered: number }[];
  recent: {
    id: string;
    agentName: string;
    status: string;
    categoryId?: string | null;
    createdAt: string;
    priceUsd?: number;
  }[];
  updatedAt: string;
};

export function outcomesFromJobs(jobs: HireJob[]): OutcomeSnapshot {
  const delivered = jobs.filter((j) => j.status === "delivered").length;
  const failed = jobs.filter((j) => j.status === "failed").length;
  const etas = jobs
    .map((j) => j.quote?.etaMinutes)
    .filter((n): n is number => typeof n === "number" && n > 0);
  const prices = jobs
    .map((j) => j.quote?.priceUsd ?? Number(j.budgetUsd))
    .filter((n) => Number.isFinite(n) && n > 0);

  const catMap = new Map<string, { count: number; delivered: number }>();
  const agentMap = new Map<
    string,
    { name: string; slug?: string; count: number; delivered: number }
  >();

  for (const j of jobs) {
    const cat = j.categoryId || "general";
    const c = catMap.get(cat) || { count: 0, delivered: 0 };
    c.count += 1;
    if (j.status === "delivered") c.delivered += 1;
    catMap.set(cat, c);

    const key = j.genesisSlug || `${j.chainId}:${j.tokenId}`;
    const a = agentMap.get(key) || {
      name: j.agentName,
      slug: j.genesisSlug,
      count: 0,
      delivered: 0,
    };
    a.count += 1;
    if (j.status === "delivered") a.delivered += 1;
    agentMap.set(key, a);
  }

  return {
    totalJobs: jobs.length,
    delivered,
    failed,
    successRate: jobs.length ? Math.round((delivered / jobs.length) * 100) : 0,
    avgEtaMinutes: etas.length
      ? Math.round((etas.reduce((s, n) => s + n, 0) / etas.length) * 10) / 10
      : null,
    avgPriceUsd: prices.length
      ? Math.round((prices.reduce((s, n) => s + n, 0) / prices.length) * 100) /
        100
      : null,
    byCategory: [...catMap.entries()].map(([categoryId, v]) => ({
      categoryId,
      ...v,
    })),
    byAgent: [...agentMap.values()].sort((a, b) => b.count - a.count),
    recent: jobs.slice(0, 12).map((j) => ({
      id: j.id,
      agentName: j.agentName,
      status: j.status,
      categoryId: j.categoryId,
      createdAt: j.createdAt,
      priceUsd: j.quote?.priceUsd,
    })),
    updatedAt: new Date().toISOString(),
  };
}

export async function getOutcomesSnapshot(): Promise<OutcomeSnapshot> {
  const jobs = await listJobs(200);
  return outcomesFromJobs(jobs);
}
