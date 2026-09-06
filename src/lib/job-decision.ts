/**
 * Buyer accept / dispute on a plan receipt.
 * This is not a payout. Escrow stays optional and blocked.
 */

import type { JobAcceptanceState } from "./job-spec";
import type { HireJob } from "./hire-engine";
import { SEED_JOBS } from "./seed-jobs";
import { hasLivePayload } from "./job-outcome";

export const DISPUTE_COOLING_MS = 7 * 24 * 60 * 60 * 1000;
export const SLASH_CAP = 0.75;
export const NEW_VERSION_INHERIT = 0.25;

export type DecisionAction = "accept" | "dispute";

export type JobDecision = {
  state: "accepted" | "disputed";
  at: string;
  reason?: string;
  by: "buyer";
  payout: false;
};

export type SellerIncident = {
  id: string;
  jobId: string;
  sellerId: string;
  genesisSlug?: string;
  sellerVersion: string;
  kind: "dispute" | "policy-break";
  weight: number;
  createdAt: string;
  expiresAt: string;
};

export function canDecide(job: HireJob): { ok: true } | { ok: false; error: string } {
  if (job.purpose === "holdout") {
    return { ok: false, error: "Holdout jobs are not buyer commerce" };
  }
  if (SEED_JOBS.some((s) => s.id === job.id)) {
    return { ok: false, error: "Demo receipts are read-only" };
  }
  if (!hasLivePayload(job) || job.status !== "delivered") {
    return { ok: false, error: "Only a delivered plan with a live payload can be accepted or disputed" };
  }
  if (job.decision) {
    return { ok: false, error: `Already ${job.decision.state}` };
  }
  const acc = job.receipt?.acceptance?.state;
  if (acc === "accepted" || acc === "disputed") {
    return { ok: false, error: `Already ${acc}` };
  }
  return { ok: true };
}

export function applyDecision(
  job: HireJob,
  action: DecisionAction,
  reason?: string,
): { ok: true; job: HireJob } | { ok: false; error: string } {
  const gate = canDecide(job);
  if (!gate.ok) return gate;
  if (action === "dispute" && !reason?.trim()) {
    return { ok: false, error: "Dispute needs a short reason" };
  }
  const decision: JobDecision = {
    state: action === "accept" ? "accepted" : "disputed",
    at: new Date().toISOString(),
    reason: reason?.trim() || undefined,
    by: "buyer",
    payout: false,
  };
  return {
    ok: true,
    job: {
      ...job,
      decision,
      updatedAt: decision.at,
    },
  };
}

export function acceptanceFromDecision(
  job: HireJob,
  schemaValid: boolean,
  checkedAt: string,
): { state: JobAcceptanceState; checkedAt: string } {
  if (job.decision?.state === "accepted") {
    return { state: "accepted", checkedAt: job.decision.at };
  }
  if (job.decision?.state === "disputed") {
    return { state: "disputed", checkedAt: job.decision.at };
  }
  return {
    state: schemaValid ? "auto-schema-valid" : "incomplete",
    checkedAt,
  };
}

export function incidentFromDispute(job: HireJob): SellerIncident | null {
  if (job.decision?.state !== "disputed") return null;
  const version =
    job.receipt?.sellerVersion ||
    job.spec?.seller.identityVersion ||
    "unknown";
  const created = job.decision.at;
  return {
    id: `inc_${job.id}_dispute`,
    jobId: job.id,
    sellerId: job.genesisSlug
      ? `genesis:${job.genesisSlug}`
      : `${job.chainId}:${job.tokenId}`,
    genesisSlug: job.genesisSlug,
    sellerVersion: version,
    kind: "dispute",
    weight: 1,
    createdAt: created,
    expiresAt: new Date(new Date(created).getTime() + DISPUTE_COOLING_MS).toISOString(),
  };
}

export function incidentFromPolicyBreak(job: HireJob): SellerIncident | null {
  if (!job.isolation?.killed) return null;
  const created = job.updatedAt || new Date().toISOString();
  const version =
    job.receipt?.sellerVersion ||
    job.spec?.seller.identityVersion ||
    "unknown";
  return {
    id: `inc_${job.id}_policy`,
    jobId: job.id,
    sellerId: job.genesisSlug
      ? `genesis:${job.genesisSlug}`
      : `${job.chainId}:${job.tokenId}`,
    genesisSlug: job.genesisSlug,
    sellerVersion: version,
    kind: "policy-break",
    weight: 0.6,
    createdAt: created,
    expiresAt: new Date(new Date(created).getTime() + DISPUTE_COOLING_MS).toISOString(),
  };
}

export function coolingPenalty(
  incidents: SellerIncident[],
  currentVersion: string,
  now = Date.now(),
): { penalty: number; open: number; why: string[] } {
  let raw = 0;
  let open = 0;
  for (const inc of incidents) {
    const start = new Date(inc.createdAt).getTime();
    const end = new Date(inc.expiresAt).getTime();
    if (end <= start) continue;
    const t = (end - now) / (end - start);
    if (t <= 0) continue;
    open += 1;
    const inherit =
      inc.sellerVersion === currentVersion ? 1 : NEW_VERSION_INHERIT;
    raw += Math.max(0, Math.min(1, t)) * inc.weight * inherit;
  }
  const penalty = Math.min(SLASH_CAP, Math.round(raw * 1000) / 1000);
  const why: string[] = [];
  if (penalty > 0) {
    why.push(
      `Cooling ${Math.round(penalty * 100)}% after ${open} incident${open === 1 ? "" : "s"}`,
    );
  }
  return { penalty, open, why };
}
