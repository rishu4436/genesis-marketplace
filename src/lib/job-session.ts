/**
 * Per-job session grant — never a master key.
 *
 * One hire → one session → one plan-only policy → revoke on deliver/fail/timeout.
 * Spend is zero. Fund movement is forbidden. Secrets are not stored here.
 */

import type { CategoryId } from "./categories";
import { mandateFor, sellerIdOf } from "./job-spec";
import { ESCROW_STANCE } from "./escrow-stance";

export const JOB_SESSION_POLICY_ID = "genesis-plan-only-session-v1" as const;

export const PLAN_HOST_ALLOWLIST = [
  "api.coingecko.com",
  "bsc-dataseed.binance.org",
  "bsc-dataseed1.bnbchain.org",
] as const;

export type JobSessionStatus =
  | "active"
  | "consumed"
  | "revoked"
  | "expired"
  | "killed";

export type JobSessionPolicy = {
  id: typeof JOB_SESSION_POLICY_ID;
  custody: false;
  mayMoveFunds: false;
  spend: "0";
  output: "structured-plan";
  venues: string[];
  hosts: string[];
  maxCalls: number;
  timeoutMs: number;
  expiresAt: string;
  escrowRequired: false;
};

export type JobSession = {
  id: string;
  jobId: string;
  sellerId: string;
  policy: JobSessionPolicy;
  status: JobSessionStatus;
  createdAt: string;
  closedAt?: string;
  closeReason?: string;
};

export type IsolationCall = {
  at: string;
  host: string;
  ok: boolean;
  denied?: string;
};

export type IsolationRecord = {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  timeoutMs: number;
  callCount: number;
  calls: IsolationCall[];
  killed: boolean;
  killReason?: string;
  secretsExposed: false;
};

function sessionId() {
  return `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function planSessionPolicy(input: {
  categoryId?: CategoryId | null;
  timeoutMs?: number;
  maxCalls?: number;
  ttlMs?: number;
}): JobSessionPolicy {
  const mandate = mandateFor(input.categoryId);
  const ttl = input.ttlMs ?? 30 * 60 * 1000;
  return {
    id: JOB_SESSION_POLICY_ID,
    custody: false,
    mayMoveFunds: false,
    spend: "0",
    output: "structured-plan",
    venues: mandate.venues,
    hosts: [...PLAN_HOST_ALLOWLIST],
    maxCalls: input.maxCalls ?? 8,
    timeoutMs: input.timeoutMs ?? 25_000,
    expiresAt: new Date(Date.now() + ttl).toISOString(),
    escrowRequired: false,
  };
}

export function grantPlanSession(input: {
  jobId: string;
  chainId: number;
  tokenId: string;
  genesisSlug?: string;
  categoryId?: CategoryId | null;
}): JobSession {
  return {
    id: sessionId(),
    jobId: input.jobId,
    sellerId: sellerIdOf(input),
    policy: planSessionPolicy({ categoryId: input.categoryId }),
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

export function closeSession(
  session: JobSession,
  status: Exclude<JobSessionStatus, "active">,
  reason: string,
): JobSession {
  if (session.status !== "active") return session;
  return {
    ...session,
    status,
    closedAt: new Date().toISOString(),
    closeReason: reason,
  };
}

export function sessionIsSpendless(session: JobSession): boolean {
  return (
    session.policy.mayMoveFunds === false &&
    session.policy.custody === false &&
    session.policy.spend === "0" &&
    session.policy.escrowRequired === false
  );
}

export function sessionPublicView(session: JobSession) {
  return {
    id: session.id,
    jobId: session.jobId,
    sellerId: session.sellerId,
    status: session.status,
    policy: session.policy,
    createdAt: session.createdAt,
    closedAt: session.closedAt ?? null,
    closeReason: session.closeReason ?? null,
    escrow: ESCROW_STANCE,
  };
}
