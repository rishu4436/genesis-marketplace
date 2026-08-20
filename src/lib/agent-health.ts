/**
 * Honest health for Genesis specialists.
 * Identity, version, runtime payload, evidence, optional platform.
 * Specialists stay hireable even when the Studio trial is dead.
 */

import { allGenesisAgents, type GenesisAgent } from "./genesis-agents";
import { getPlatformConfig } from "./platform-a2a";
import { listJobs } from "./job-store";
import type { HireJob } from "./hire-engine";
import { identityFromGenesis, type SellerIdentity } from "./seller-identity";
import {
  apexHealthMatchesIdentity,
  apexHealthPayload,
  type ApexHealthPayload,
} from "./apex-health";
import {
  classifyHealth,
  healthStyle,
  type HealthChecks,
  type LiveStatus,
} from "./agent-health-model";

export type { LiveStatus, HealthChecks } from "./agent-health-model";
export { healthStyle, classifyHealth };

export type AgentHealth = {
  slug: string;
  name: string;
  status: LiveStatus;
  label: string;
  detail: string;
  checkedAt: string;
  serviceUrl?: string;
  platform: boolean;
  tokenId?: string;
  hireable: boolean;
  version: string;
  identityHash: string;
  sellerId: string;
  checks: HealthChecks;
  evidence: {
    jobId: string;
    sellerVersion: string;
    deliveredAt: string | null;
  } | null;
  identity: SellerIdentity;
};

async function probeUrl(
  url: string,
  ms = 4000,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(t);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "probe failed",
    };
  }
}

function evidenceForSeller(
  jobs: HireJob[],
  identity: SellerIdentity,
): AgentHealth["evidence"] {
  const hits = jobs.filter((j) => {
    if (j.status !== "delivered") return false;
    if (j.genesisSlug && identity.sellerId === `genesis:${j.genesisSlug}`) {
      const ver = j.receipt?.sellerVersion || j.spec?.seller.identityVersion;
      return !ver || ver === identity.version;
    }
    return false;
  });
  if (hits.length === 0) return null;
  const latest = hits[0];
  return {
    jobId: latest.id,
    sellerVersion: latest.receipt?.sellerVersion || identity.version,
    deliveredAt:
      latest.receipt?.timestamps.deliveredAt || latest.updatedAt || null,
  };
}

function parseApexBody(raw: unknown): ApexHealthPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ApexHealthPayload>;
  if (r.status !== "ok" || !r.slug || !r.version || !r.identityHash) return null;
  if (!r.mandate || r.mandate.mayMoveFunds !== false) return null;
  return r as ApexHealthPayload;
}

export async function checkAgentHealth(
  agent: GenesisAgent,
  origin?: string,
  jobs?: HireJob[],
): Promise<AgentHealth> {
  const checkedAt = new Date().toISOString();
  const identity = identityFromGenesis(agent, origin);
  const platform = getPlatformConfig(agent.slug);

  const localPayload = apexHealthPayload(agent.slug);
  const localMatch = localPayload
    ? apexHealthMatchesIdentity(localPayload, {
        slug: agent.slug,
        version: identity.version,
        identityHash: identity.identityHash,
      })
    : { ok: false, detail: "no APEX payload" };

  let remotePayload: ApexHealthPayload | null = null;
  const base = origin?.replace(/\/$/, "") || "";
  if (base) {
    try {
      const url = `${base}/api/apex/${agent.slug}/health`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(t);
      if (res.ok) {
        remotePayload = parseApexBody(await res.json());
      }
    } catch {
      /* in-process payload still counts */
    }
  }

  const remoteMatch = remotePayload
    ? apexHealthMatchesIdentity(remotePayload, {
        slug: agent.slug,
        version: identity.version,
        identityHash: identity.identityHash,
      })
    : null;

  const runtimeOk = localMatch.ok || Boolean(remoteMatch?.ok);
  const versionOk =
    (localPayload?.version === identity.version ||
      remotePayload?.version === identity.version) &&
    runtimeOk;

  let platformOk = false;
  let platformDetail = "Studio trial expired. Hire runs on Genesis APEX.";
  const genesisCard = base
    ? `${base}/api/apex/${agent.slug}/.well-known/agent-card.json`
    : "";
  if (genesisCard) {
    const g = await probeUrl(genesisCard, 4000);
    if (g.ok) {
      platformOk = true;
      platformDetail = "Genesis APEX · Studio trial expired";
    }
  }
  if (platform?.cardUrl) {
    const p = await probeUrl(platform.cardUrl, 4000);
    if (p.ok) {
      platformOk = true;
      platformDetail = "Studio card reachable";
    }
  }

  const jobList = jobs ?? (await listJobs(200));
  const evidence = evidenceForSeller(jobList, identity);

  const checks: HealthChecks = {
    identity: {
      ok: identity.erc8004 && Boolean(identity.controller),
      detail: identity.erc8004
        ? `ERC-8004 #${identity.tokenId} · ${identity.controller?.slice(0, 8) ?? "no controller"}…`
        : "No ERC-8004 token pinned",
    },
    runtime: {
      ok: runtimeOk,
      detail: remoteMatch?.ok
        ? "APEX health confirmed this seller"
        : localMatch.ok
          ? "In-process APEX payload matches pin"
          : remoteMatch?.detail || localMatch.detail,
    },
    version: {
      ok: Boolean(versionOk),
      detail: versionOk
        ? identity.version
        : `expected ${identity.version}`,
    },
    mandate: {
      ok:
        identity.mandate.custody === false &&
        identity.mandate.mayMoveFunds === false &&
        (localPayload?.mandate.mayMoveFunds === false ||
          remotePayload?.mandate.mayMoveFunds === false ||
          localMatch.ok),
      detail: "plan only · no custody · no fund movement",
    },
    evidence: {
      ok: Boolean(evidence),
      detail: evidence
        ? `${evidence.jobId} · ${evidence.sellerVersion}`
        : "No delivered receipt on this version yet",
    },
    platform: {
      ok: platformOk,
      detail: platformDetail,
    },
  };

  const classified = classifyHealth(checks);

  return {
    slug: agent.slug,
    name: agent.name,
    status: classified.status,
    label: classified.label,
    detail: classified.detail,
    checkedAt,
    serviceUrl: agent.serviceUrl,
    platform: platformOk,
    tokenId: identity.tokenId || undefined,
    hireable: true,
    version: identity.version,
    identityHash: identity.identityHash,
    sellerId: identity.sellerId,
    checks,
    evidence,
    identity,
  };
}

export async function checkAllAgentHealth(
  origin?: string,
): Promise<AgentHealth[]> {
  const agents = allGenesisAgents();
  const jobs = await listJobs(200);
  return Promise.all(agents.map((a) => checkAgentHealth(a, origin, jobs)));
}
