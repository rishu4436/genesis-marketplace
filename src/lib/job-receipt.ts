/**
 * Evidence receipt for a hire.
 *
 * Platform seals spec + output hashes at persist time.
 * Later reads verify against the stored receipt — they do not re-seal,
 * so a tampered file fails the check.
 */

import { createHash } from "crypto";
import type { HireDeliverable, HireJob } from "./hire-engine";
import {
  type JobReceipt,
  type JobSpec,
  MARKETPLACE_MANDATE_ID,
  canonicalize,
  mandateFor,
  normalizeTask,
  sellerIdOf,
  sellerIdentityVersion,
} from "./job-spec";
import { identityHashForSeller } from "./seller-identity";
import { ESCROW_STANCE } from "./escrow-stance";
import { acceptanceFromDecision } from "./job-decision";

export type ReceiptVerify = {
  ok: boolean;
  specMatch: boolean;
  outputMatch: boolean;
  schemaValid: boolean;
  mandateHolds: boolean;
  issues: string[];
  specHash: string;
  outputHash: string | null;
  receiptSpecHash: string | null;
  receiptOutputHash: string | null;
};

export function sha256Hex(canonical: string): string {
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function specFromJob(job: Pick<
  HireJob,
  | "categoryId"
  | "task"
  | "budgetUsd"
  | "duration"
  | "risk"
  | "notes"
  | "chainId"
  | "tokenId"
  | "agentName"
  | "genesisSlug"
>): JobSpec {
  return {
    schemaVersion: 1,
    categoryId: job.categoryId ?? null,
    task: normalizeTask(job.task || ""),
    budgetUsd: String(job.budgetUsd ?? ""),
    duration: job.duration,
    risk: job.risk,
    notes: normalizeTask(job.notes || ""),
    seller: {
      chainId: job.chainId,
      tokenId: String(job.tokenId),
      agentName: job.agentName,
      genesisSlug: job.genesisSlug,
      identityVersion: sellerIdentityVersion({
        genesisSlug: job.genesisSlug,
        tokenId: String(job.tokenId),
        chainId: job.chainId,
      }),
    },
    mandate: mandateFor(job.categoryId),
  };
}

export function deliverableCanon(d: HireDeliverable | undefined): unknown | null {
  if (!d) return null;
  return {
    title: d.title,
    summary: d.summary,
    sections: d.sections.map((s) => ({ heading: s.heading, body: s.body })),
    metrics: (d.metrics || []).map((m) => ({ label: m.label, value: m.value })),
    disclaimer: d.disclaimer || "",
  };
}

export function hashSpec(spec: JobSpec): string {
  return sha256Hex(canonicalize(spec));
}

export function hashDeliverable(d: HireDeliverable | undefined): string | null {
  const canon = deliverableCanon(d);
  if (!canon) return null;
  return sha256Hex(canonicalize(canon));
}

export function deliverableSchemaValid(
  d: HireDeliverable | undefined,
): boolean {
  if (!d) return false;
  if (!d.title?.trim()) return false;
  if (!d.summary?.trim()) return false;
  if (!Array.isArray(d.sections) || d.sections.length < 1) return false;
  return d.sections.every(
    (s) => Boolean(s.heading?.trim()) && typeof s.body === "string",
  );
}

function deliveredAtOf(job: HireJob): string | null {
  if (job.status !== "delivered") return null;
  const hit = [...job.timeline].reverse().find((t) => t.status === "delivered");
  return hit?.at || job.updatedAt || null;
}

export function buildReceipt(
  job: HireJob,
  spec: JobSpec,
  opts?: { sealedAt?: string },
): JobReceipt {
  const schemaValid = deliverableSchemaValid(job.deliverable);
  const sealedAt = opts?.sealedAt || job.updatedAt || job.createdAt;
  return {
    schemaVersion: 1,
    jobId: job.id,
    claimCode: job.claimCode,
    specHash: hashSpec(spec),
    outputHash: hashDeliverable(job.deliverable),
    algorithm: "sha256",
    sellerId: sellerIdOf(job),
    sellerVersion: spec.seller.identityVersion,
    buyerId: job.ownerId ?? null,
    mandate: spec.mandate,
    quote: job.quote
      ? {
          priceUsd: job.quote.priceUsd ?? null,
          currency: job.quote.currency ?? null,
          protocol: job.quote.protocol ?? null,
          etaMinutes: job.quote.etaMinutes ?? null,
          expiresAt: job.quote.expiresAt ?? null,
        }
      : null,
    timestamps: {
      createdAt: job.createdAt,
      deliveredAt: deliveredAtOf(job),
      sealedAt,
    },
    paymentRef: job.payment
      ? {
          method: job.payment.method,
          txHash: job.payment.txHash,
          demo: job.payment.demo,
        }
      : null,
    acceptance: acceptanceFromDecision(job, schemaValid, sealedAt),
    policyId: MARKETPLACE_MANDATE_ID,
    identityHash:
      identityHashForSeller({
        genesisSlug: job.genesisSlug,
        chainId: job.chainId,
        tokenId: String(job.tokenId),
        categoryId: job.categoryId,
      }) ?? undefined,
    sessionId: job.session?.id,
    isolation: job.isolation
      ? {
          sessionId: job.isolation.sessionId,
          callCount: job.isolation.callCount,
          killed: job.isolation.killed,
          killReason: job.isolation.killReason,
          secretsExposed: false,
        }
      : undefined,
    escrow: {
      required: false,
      available: ESCROW_STANCE.available,
      reason: ESCROW_STANCE.reason,
    },
  };
}

export function sealJob(
  job: HireJob,
  opts?: { resign?: boolean },
): HireJob {
  if (job.spec && job.receipt && !opts?.resign) return job;
  const spec = specFromJob(job);
  const receipt = buildReceipt(job, spec, {
    sealedAt: opts?.resign
      ? new Date().toISOString()
      : job.updatedAt || job.createdAt,
  });
  return { ...job, spec, receipt };
}

export function verifyJobReceipt(job: HireJob): ReceiptVerify {
  const spec = specFromJob(job);
  const specHash = hashSpec(spec);
  const outputHash = hashDeliverable(job.deliverable);
  const schemaValid = deliverableSchemaValid(job.deliverable);
  const stored = job.receipt;
  const receiptSpecHash = stored?.specHash ?? null;
  const receiptOutputHash = stored?.outputHash ?? null;

  const specMatch = Boolean(stored && receiptSpecHash === specHash);
  const outputMatch = Boolean(stored) && receiptOutputHash === outputHash;

  const mandate = stored?.mandate ?? spec.mandate;
  const mandateHolds =
    mandate.custody === false &&
    mandate.mayMoveFunds === false &&
    mandate.output === "structured-plan" &&
    mandate.id === MARKETPLACE_MANDATE_ID;

  const issues: string[] = [];
  if (!stored) issues.push("no receipt sealed");
  if (stored && !specMatch) issues.push("spec hash mismatch — brief or seller changed");
  if (stored && !outputMatch) {
    issues.push("output hash mismatch — deliverable changed after seal");
  }
  if (!schemaValid) issues.push("deliverable fails schema (title, summary, sections)");
  if (!mandateHolds) issues.push("mandate broken — custody or fund movement is not allowed");

  return {
    ok: specMatch && outputMatch && schemaValid && mandateHolds,
    specMatch,
    outputMatch,
    schemaValid,
    mandateHolds,
    issues,
    specHash,
    outputHash,
    receiptSpecHash,
    receiptOutputHash,
  };
}

export function jobWithEvidence(job: HireJob): {
  job: HireJob;
  spec: JobSpec;
  receipt: JobReceipt;
  verify: ReceiptVerify;
} {
  const sealed = sealJob(job);
  return {
    job: sealed,
    spec: sealed.spec!,
    receipt: sealed.receipt!,
    verify: verifyJobReceipt(sealed),
  };
}
