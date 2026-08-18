/**
 * Canonical job spec — the unit of sale.
 *
 * A hire is a typed request + a fixed mandate, not a chat blob.
 * Spec hash covers the request only (not timestamps, quotes, or output).
 *
 * Hackathon rails (do not change):
 *  - four job categories stay first-class
 *  - output is a structured plan
 *  - platform never takes custody / never moves buyer funds
 */

import type { CategoryId } from "./categories";
import type { HireIntent } from "./hire";

export const JOB_SPEC_VERSION = 1 as const;
export const MARKETPLACE_MANDATE_ID = "genesis-plan-only-v1" as const;
export const SELLER_ENGINE_VERSION = "specialist-plan-v1";

export type JobMandate = {
  id: typeof MARKETPLACE_MANDATE_ID;
  custody: false;
  mayMoveFunds: false;
  output: "structured-plan";
  venues: string[];
};

export type JobSellerRef = {
  chainId: number;
  tokenId: string;
  agentName: string;
  genesisSlug?: string;
  identityVersion: string;
};

export type JobSpec = {
  schemaVersion: typeof JOB_SPEC_VERSION;
  categoryId: CategoryId | null;
  task: string;
  budgetUsd: string;
  duration: HireIntent["duration"];
  risk: HireIntent["risk"];
  notes: string;
  seller: JobSellerRef;
  mandate: JobMandate;
};

export type JobAcceptanceState =
  | "incomplete"
  | "auto-schema-valid"
  | "accepted"
  | "disputed";

export type JobAcceptance = {
  state: JobAcceptanceState;
  checkedAt: string;
};

export type JobReceipt = {
  schemaVersion: typeof JOB_SPEC_VERSION;
  jobId: string;
  claimCode?: string;
  specHash: string;
  outputHash: string | null;
  algorithm: "sha256";
  sellerId: string;
  sellerVersion: string;
  buyerId: string | null;
  mandate: JobMandate;
  quote: {
    priceUsd: number | null;
    currency: string | null;
    protocol: string | null;
    etaMinutes: number | null;
    expiresAt: string | null;
  } | null;
  timestamps: {
    createdAt: string;
    deliveredAt: string | null;
    sealedAt: string;
  };
  paymentRef: {
    method: string;
    txHash?: string;
    demo?: boolean;
  } | null;
  acceptance: JobAcceptance;
  policyId: typeof MARKETPLACE_MANDATE_ID;
  /** Bound seller identity hash (controller + token + version + mandate) */
  identityHash?: string;
  sessionId?: string;
  isolation?: {
    sessionId: string;
    callCount: number;
    killed: boolean;
    killReason?: string;
    secretsExposed: false;
  };
  escrow?: {
    required: false;
    available: boolean;
    reason: string;
  };
};

const VENUES: Record<CategoryId, string[]> = {
  rebalancing: ["pancakeswap-v3"],
  "grid-trading": ["bsc-spot", "pancakeswap"],
  "yield-optimisation": ["venus", "pancakeswap-farms"],
  "health-factor": ["venus", "aave-style"],
};

export function normalizeTask(task: string): string {
  return task.trim().replace(/\s+/g, " ");
}

export function sellerIdentityVersion(input: {
  genesisSlug?: string;
  tokenId: string;
  chainId: number;
}): string {
  const name =
    input.genesisSlug || `erc8004:${input.chainId}:${input.tokenId}`;
  return `${name}@${SELLER_ENGINE_VERSION}`;
}

export function sellerIdOf(input: {
  genesisSlug?: string;
  chainId: number;
  tokenId: string;
}): string {
  if (input.genesisSlug) return `genesis:${input.genesisSlug}`;
  return `${input.chainId}:${input.tokenId}`;
}

export function mandateFor(categoryId?: CategoryId | null): JobMandate {
  return {
    id: MARKETPLACE_MANDATE_ID,
    custody: false,
    mayMoveFunds: false,
    output: "structured-plan",
    venues: categoryId ? VENUES[categoryId] : ["bsc"],
  };
}

export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(rec)
        .sort()
        .map((k) => [k, sortKeys(rec[k])]),
    );
  }
  return value;
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}
