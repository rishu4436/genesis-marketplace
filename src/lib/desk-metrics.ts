/**
 * North-star counters. Escrowed+paid stays 0 until a real ERC-8183
 * lock with payment-tied feedback exists. Do not invent GMV.
 */

import { listJobs } from "./job-store";
import type { HireJob } from "./hire-engine";

export type DeskWeek = {
  windowDays: 7;
  asOf: string;
  l0PlansDelivered: number;
  l2EscrowedPaid: number;
  uniquePayers: number;
  northStar: string;
};

const CACHE_MS = 60_000;
let cached: { at: number; week: DeskWeek } | null = null;

function isPaidEscrow(job: HireJob): boolean {
  if (job.status !== "delivered") return false;
  if (job.tier !== "escrow") return false;
  return job.quote?.protocol === "ERC-8183";
}

export async function deskWeek(): Promise<DeskWeek> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.week;
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const jobs = await listJobs(80);
  const recent = jobs.filter((j) => {
    const t = Date.parse(j.updatedAt || j.createdAt || "");
    return Number.isFinite(t) && t >= since;
  });
  const l0PlansDelivered = recent.filter(
    (j) =>
      j.status === "delivered" &&
      Boolean(j.deliverable) &&
      j.purpose !== "holdout" &&
      (Boolean(j.genesisSlug) || j.quote?.live === true),
  ).length;
  const paid = recent.filter(isPaidEscrow);
  const payers = new Set(
    paid
      .map((j) =>
        (j.escrow?.buyer || j.payment?.walletAddress || "").toLowerCase(),
      )
      .filter(Boolean),
  );
  const week: DeskWeek = {
    windowDays: 7,
    asOf: new Date().toISOString(),
    l0PlansDelivered,
    l2EscrowedPaid: paid.length,
    uniquePayers: payers.size,
    northStar:
      "Completed escrowed jobs with payment-tied feedback / week",
  };
  cached = { at: Date.now(), week };
  return week;
}
