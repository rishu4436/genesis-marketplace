/**
 * Honest hire outcome. A schema-valid writeup is not a live payload.
 * Genesis specialist plans and third-party report/sample (quote.live) count.
 * Quote-only / identity-only / escrow-funded-without-payload never read as Ready.
 */

export type JobOutcomeKind =
  | "ready"
  | "quoted"
  | "working"
  | "funded"
  | "disputed";

export type JobOutcomeInput = {
  status?: string;
  genesisSlug?: string;
  quote?: { live?: boolean } | null;
  deliverable?: {
    title?: string;
    summary?: string;
    sections?: unknown[];
  } | null;
  escrow?: { fundTx?: string; chainStatus?: string } | null;
  decision?: { state?: string } | null;
  receipt?: { acceptance?: { state?: string } } | null;
};

function schemaPresent(d: JobOutcomeInput["deliverable"]): boolean {
  return Boolean(
    d?.title?.trim() &&
      d?.summary?.trim() &&
      Array.isArray(d.sections) &&
      d.sections.length > 0,
  );
}

export function hasLivePayload(job: JobOutcomeInput): boolean {
  if (!schemaPresent(job.deliverable)) return false;
  if (job.genesisSlug) return true;
  if (job.quote?.live === true) return true;
  return false;
}

function decisionState(job: JobOutcomeInput): string | undefined {
  return job.decision?.state || job.receipt?.acceptance?.state;
}

export function jobOutcome(job: JobOutcomeInput): {
  kind: JobOutcomeKind;
  label: string;
  hint: string;
} {
  const live = hasLivePayload(job);
  const decision = decisionState(job);
  if (decision === "disputed") {
    return {
      kind: "disputed",
      label: "Disputed",
      hint: "Not Delivered — buyer disputed this plan",
    };
  }
  if (job.escrow?.fundTx && !live) {
    const st = (job.escrow.chainStatus || "").toUpperCase();
    if (st === "FUNDED" || st === "OPEN" || !st) {
      return {
        kind: "funded",
        label: "Escrow funded",
        hint: "Awaiting deliverable — not Delivered",
      };
    }
    return {
      kind: "working",
      label: "Working",
      hint: "Escrow funded · payload not in yet",
    };
  }
  if (live && job.status === "delivered" && job.genesisSlug) {
    return {
      kind: "ready",
      label: "Ready",
      hint: "Delivered · this is your receipt",
    };
  }
  if (!job.genesisSlug && (job.quote?.live === true || live)) {
    return {
      kind: "quoted",
      label: "Quoted · live sample",
      hint: "Not Delivered. Their sample is not an escrowed plan.",
    };
  }
  if (job.quote?.live === false || (!live && !job.genesisSlug)) {
    return {
      kind: "quoted",
      label: "Quote only · payload unavailable",
      hint: "Not Delivered. Retry the hire or dismiss.",
    };
  }
  return {
    kind: "quoted",
    label: job.status === "quoted" ? "Quoted" : job.status || "Quoted",
    hint: "Quote only · no live payload",
  };
}
