/**
 * North-star counters. Settled/paid stays 0 until a real ERC-8183
 * settle tx exists. Funded is a lock, not a payout. Do not invent GMV.
 */

import { listJobs } from "./job-store";
import type { HireJob } from "./hire-engine";
import { isTxHash } from "./erc8183-escrow";

export type DeskWeek = {
  windowDays: 7;
  asOf: string;
  l0PlansDelivered: number;
  l2EscrowFunded: number;
  l2EscrowedPaid: number;
  uniquePayers: number;
  northStar: string;
};

const CACHE_MS = 60_000;
let cached: { at: number; week: DeskWeek } | null = null;

function isEscrowJob(job: HireJob): boolean {
  if (job.purpose === "holdout") return false;
  if (job.tier !== "escrow") return false;
  if (job.quote?.protocol === "ERC-8183-sim") return false;
  return isTxHash(job.escrow?.fundTx);
}

function isPaidEscrow(job: HireJob): boolean {
  return isEscrowJob(job) && isTxHash(job.escrow?.settleTx);
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
  const funded = recent.filter(isEscrowJob);
  const paid = funded.filter(isPaidEscrow);
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
    l2EscrowFunded: funded.length,
    l2EscrowedPaid: paid.length,
    uniquePayers: payers.size,
    northStar:
      "Completed escrowed jobs with payment-tied feedback / week",
  };
  cached = { at: Date.now(), week };
  return week;
}
