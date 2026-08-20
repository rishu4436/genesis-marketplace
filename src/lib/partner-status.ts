/**
 * Live partner probes for /partners, hire strip, and /api/partners/status.
 * Timeouts stay short so a down partner never hangs the floor.
 */

import { PARTNERS, type PartnerId } from "./partners";
import { getStatsSafe } from "./scan";
import { altanaStatus } from "./altana/client";
import { readLiveProof } from "./altana/proof";
import { ADVANTAGE_TASKS } from "./advantage-report";
import { fetchOnchainMarket } from "./onchain-market";
import { FEATURED_THIRD_PARTY } from "./third-party-sellers";

export type PartnerMode = "live" | "proof" | "local" | "down";

export type PartnerProbe = {
  id: PartnerId;
  name: string;
  track: string;
  ok: boolean;
  mode: PartnerMode;
  detail: string;
  metric?: string;
  href: string;
  docs?: string;
  powers: string[];
};

export type PartnerSnapshot = {
  fetchedAt: string;
  liveCount: number;
  total: number;
  partners: PartnerProbe[];
};

function abortMs(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

async function probe8004scan(): Promise<Pick<PartnerProbe, "ok" | "mode" | "detail" | "metric">> {
  const stats = await getStatsSafe();
  const agents = stats.data?.total_agents ?? null;
  const ratings = stats.data?.total_feedbacks ?? null;
  if (agents == null && stats.error) {
    return {
      ok: false,
      mode: "down",
      detail: stats.error,
    };
  }
  return {
    ok: agents != null && agents > 0,
    mode: agents != null && agents > 0 ? "live" : "down",
    detail:
      agents != null
        ? "Public ERC-8004 index answering"
        : stats.error || "Index returned no totals",
    metric:
      agents != null
        ? `~${agents.toLocaleString("en-US")} indexed${
            ratings != null ? ` · ${ratings.toLocaleString("en-US")} ratings` : ""
          }`
        : undefined,
  };
}

async function probeAltana(): Promise<Pick<PartnerProbe, "ok" | "mode" | "detail" | "metric">> {
  const status = altanaStatus();
  const proof = await readLiveProof();
  if (proof?.transactionHash) {
    return {
      ok: true,
      mode: "proof",
      detail: `${proof.agentName} Keystore grant on chain ${proof.chainId}`,
      metric: `${proof.transactionHash.slice(0, 10)}…`,
    };
  }
  if (status.liveCapable) {
    return {
      ok: true,
      mode: "live",
      detail: status.note,
      metric: status.network,
    };
  }
  return {
    ok: true,
    mode: "local",
    detail: "Demo policy available. Live grant needs ALTANA_ADMIN_PRIVATE_KEY.",
    metric: "demo-policy",
  };
}

function probeTermix(): Pick<PartnerProbe, "ok" | "mode" | "detail" | "metric"> {
  const n = ADVANTAGE_TASKS.length;
  const weighted = ADVANTAGE_TASKS.filter(
    (t) => t.stakes === "trading" || t.stakes === "security",
  ).length;
  return {
    ok: n >= 3 && weighted >= 1,
    mode: n >= 3 ? "local" : "down",
    detail: `${n} with-vs-without tasks · ${weighted} high-stakes`,
    metric: `${n} tasks`,
  };
}

async function probePcs(): Promise<Pick<PartnerProbe, "ok" | "mode" | "detail" | "metric">> {
  const m = await fetchOnchainMarket();
  const live = m.pools.filter((p) => p.ok && p.price != null);
  if (live.length === 0) {
    return {
      ok: false,
      mode: "down",
      detail: m.pools[0]?.detail || "BSC RPC unreachable",
    };
  }
  const first = live[0];
  return {
    ok: true,
    mode: "live",
    detail: `PCS V3 slot0 via ${m.rpc?.replace(/^https:\/\//, "") || "BSC RPC"}`,
    metric: `${first.pair} ${first.price}`,
  };
}

async function probeFeatured(): Promise<Pick<PartnerProbe, "ok" | "mode" | "detail" | "metric">> {
  try {
    const res = await fetch(FEATURED_THIRD_PARTY.a2aCardUrl, {
      headers: { Accept: "application/json" },
      signal: abortMs(5_000),
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        ok: false,
        mode: "down",
        detail: `A2A card HTTP ${res.status}`,
        metric: `#${FEATURED_THIRD_PARTY.tokenId}`,
      };
    }
    return {
      ok: true,
      mode: "live",
      detail: "Featured seller agent card reachable",
      metric: `#${FEATURED_THIRD_PARTY.tokenId}`,
    };
  } catch (e) {
    return {
      ok: false,
      mode: "down",
      detail: e instanceof Error ? e.message : "A2A card unreachable",
      metric: `#${FEATURED_THIRD_PARTY.tokenId}`,
    };
  }
}

let cached: { at: number; snap: PartnerSnapshot } | null = null;
const CACHE_MS = 60_000;

export async function probePartners(): Promise<PartnerSnapshot> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.snap;

  const [scan, altana, pcs, featured] = await Promise.all([
    probe8004scan(),
    probeAltana(),
    probePcs(),
    probeFeatured(),
  ]);
  const termix = probeTermix();

  const byId: Record<PartnerId, Pick<PartnerProbe, "ok" | "mode" | "detail" | "metric">> = {
    "8004scan": scan,
    altana,
    termix,
    pancakeswap: pcs,
    "featured-a2a": featured,
  };

  const partners: PartnerProbe[] = PARTNERS.map((def) => {
    const p = byId[def.id];
    return {
      id: def.id,
      name: def.name,
      track: def.track,
      href: def.href,
      docs: def.docs,
      powers: def.powers,
      ...p,
    };
  });

  const snap: PartnerSnapshot = {
    fetchedAt: new Date().toISOString(),
    liveCount: partners.filter((p) => p.ok && p.mode !== "down").length,
    total: partners.length,
    partners,
  };
  cached = { at: Date.now(), snap };
  return snap;
}
