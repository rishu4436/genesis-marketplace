/**
 * APEX health payload — the runtime must speak identity, not just 200.
 */

import { getGenesisAgent } from "./genesis-agents";
import { identityFromGenesis } from "./seller-identity";

export type ApexHealthPayload = {
  status: "ok";
  service: "erc8183-service (genesis)";
  keyless: true;
  slug: string;
  agent: string;
  categoryId: string;
  version: string;
  tokenId: string | null;
  chainId: number;
  sellerId: string;
  identityHash: string;
  mandate: {
    id: string;
    custody: false;
    mayMoveFunds: false;
    output: "structured-plan";
  };
  hireable: true;
};

export function apexHealthPayload(slug: string): ApexHealthPayload | null {
  const agent = getGenesisAgent(slug);
  if (!agent) return null;
  const identity = identityFromGenesis(agent);
  return {
    status: "ok",
    service: "erc8183-service (genesis)",
    keyless: true,
    slug: agent.slug,
    agent: agent.name,
    categoryId: agent.categoryId,
    version: identity.version,
    tokenId: identity.tokenId,
    chainId: identity.chainId,
    sellerId: identity.sellerId,
    identityHash: identity.identityHash,
    mandate: {
      id: identity.mandate.id,
      custody: false,
      mayMoveFunds: false,
      output: "structured-plan",
    },
    hireable: true,
  };
}

export function apexHealthMatchesIdentity(
  payload: ApexHealthPayload,
  expected: {
    slug: string;
    version: string;
    identityHash: string;
  },
): { ok: boolean; detail: string } {
  if (payload.slug !== expected.slug) {
    return { ok: false, detail: `runtime slug ${payload.slug} ≠ ${expected.slug}` };
  }
  if (payload.version !== expected.version) {
    return {
      ok: false,
      detail: `runtime version ${payload.version} ≠ ${expected.version}`,
    };
  }
  if (payload.identityHash !== expected.identityHash) {
    return { ok: false, detail: "runtime identity hash does not match pin" };
  }
  if (payload.mandate.mayMoveFunds !== false || payload.mandate.custody !== false) {
    return { ok: false, detail: "runtime mandate allows custody or fund movement" };
  }
  return { ok: true, detail: `${payload.version} · ${payload.sellerId}` };
}
