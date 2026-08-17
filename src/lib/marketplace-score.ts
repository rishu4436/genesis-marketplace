/**
 * Genesis marketplace scoring system (5-axis pentagon).
 *
 * Data is pulled from the partner index (8004scan public API / “data centre”)
 * and normalized into 0–100 axes for radar display + a single composite.
 *
 * Axes (pentagon):
 *  1. Reputation  — real 8004scan average only; unrated is absent, never invented
 *  2. Trust       — verification + on-chain identity signals
 *  3. Reach       — stars / social proof
 *  4. Commerce    — x402 + protocols (can get paid / interoperable)
 *  5. Fitness     — partner total_score + health_score + description depth
 */

import type { Agent } from "./types";
import { listAgentsSafe, getStatsSafe, dedupeAgents, BSC_CHAIN_ID } from "./scan";
import { formatAverageScore, toHundredPointScale } from "./feedback-score";
import { allGenesisAgents, genesisToAgentCard } from "./genesis-agents";

export type ScoreAxisId =
  | "reputation"
  | "trust"
  | "reach"
  | "commerce"
  | "fitness";

export type ScoreAxis = {
  id: ScoreAxisId;
  label: string;
  short: string;
  /** 0–100 */
  value: number;
  /** Where the number came from (partner fields) */
  source: string;
  /** True when this axis has no real signal — omit from readiness, do not invent a score */
  absent?: boolean;
};

export type MarketplaceScorecard = {
  agentKey: string;
  name: string;
  chainId: number;
  tokenId: string | number;
  href: string;
  imageUrl?: string | null;
  axes: ScoreAxis[];
  /** Weighted composite 0–100 */
  composite: number;
  isGenesisSpecialist: boolean;
};

export type MarketplaceDashboardSnapshot = {
  fetchedAt: string;
  partner: {
    name: string;
    endpoint: string;
    totalAgentsIndexed: number | null;
    totalFeedbacks: number | null;
  };
  /** Average axes across sample (marketplace health) */
  marketAxes: ScoreAxis[];
  marketComposite: number;
  /** Top agents by composite */
  top: MarketplaceScorecard[];
  sampleSize: number;
  error: string | null;
};

const AXIS_META: {
  id: ScoreAxisId;
  label: string;
  short: string;
  weight: number;
}[] = [
  { id: "reputation", label: "Reputation", short: "Rep", weight: 0.25 },
  { id: "trust", label: "Trust", short: "Trust", weight: 0.2 },
  { id: "reach", label: "Reach", short: "Reach", weight: 0.15 },
  { id: "commerce", label: "Commerce", short: "Pay", weight: 0.2 },
  { id: "fitness", label: "Fitness", short: "Fit", weight: 0.2 },
];

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Map partner agent record → 5 axes (0–100 each) */
export function computeAxes(agent: Agent): ScoreAxis[] {
  const avg = num(agent.average_score);
  const avg100 = toHundredPointScale(avg);
  const feedbacks = num(agent.total_feedbacks);
  const stars = num(agent.star_count);
  const total = num(agent.total_score); // 8004scan cluster is ~0–50 even at the top
  const health = num(agent.health_score);
  const protocols = agent.supported_protocols?.length ?? 0;
  const hasListing =
    Boolean(agent.owner_address) ||
    Boolean(agent.description && agent.description.length > 40);

  // Reputation: only a real 8004scan average. Unrated is absent — never a fake floor.
  const rated = avg100 > 0 && feedbacks > 0;
  const reputation = rated
    ? clamp01(avg100 * 0.9 + Math.min(feedbacks, 20) * 0.5)
    : 0;
  const reputationSource = rated
    ? `avg ${formatAverageScore(avg)} · ${feedbacks} ratings`
    : feedbacks > 0
      ? `${feedbacks} ratings · no average yet`
      : "Unrated — no on-chain ratings";

  // Trust: verified identity + owner presence + non-empty listing
  let trust = 20;
  if (agent.is_verified) trust += 45;
  if (agent.owner_address) trust += 15;
  if (agent.description && agent.description.length > 60) trust += 12;
  if (agent.image_url) trust += 8;
  if (agent.agent_id || agent.token_id != null) trust += 6;
  trust = clamp01(trust);

  // Reach: stars + rating volume only. No invented floor.
  const reachRaw =
    Math.min(stars, 80) * 0.65 + Math.min(feedbacks, 40) * 0.85;
  const reach = clamp01(reachRaw);
  const reachAbsent = stars <= 0 && feedbacks <= 0;

  // Commerce: can take payments / multi-protocol
  let commerce = 15;
  if (agent.x402_supported) commerce += 50;
  commerce += Math.min(protocols, 5) * 7;
  commerce = clamp01(commerce);

  // Fitness: stretch 8004scan's ~0–50 total_score toward 0–100
  const fitness = clamp01(
    (total > 0
      ? Math.min(total, 55) * 1.7
      : hasListing
        ? 22
        : 8) +
      (health > 0 ? Math.min(health, 100) * 0.1 : 0) +
      (agent.description && agent.description.length > 100 ? 6 : 0),
  );

  const values: Record<
    ScoreAxisId,
    { value: number; source: string; absent?: boolean }
  > = {
    reputation: {
      value: reputation,
      source: reputationSource,
      absent: !rated,
    },
    trust: {
      value: trust,
      source: agent.is_verified ? "verified + identity" : "unverified listing",
    },
    reach: {
      value: reach,
      source: reachAbsent
        ? "Unrated — no stars or ratings"
        : `${stars} stars · ${feedbacks} ratings`,
      absent: reachAbsent,
    },
    commerce: {
      value: commerce,
      source: agent.x402_supported
        ? `x402 · ${protocols} protocols`
        : `${protocols} protocols`,
    },
    fitness: {
      value: fitness,
      source: `partner total ${total || "—"} · health ${health || "—"}`,
    },
  };

  return AXIS_META.map((m) => ({
    id: m.id,
    label: m.label,
    short: m.short,
    value: Math.round(values[m.id].value * 10) / 10,
    source: values[m.id].source,
    absent: values[m.id].absent,
  }));
}

export function compositeFromAxes(axes: ScoreAxis[]): number {
  let sum = 0;
  let wsum = 0;
  for (const m of AXIS_META) {
    const ax = axes.find((a) => a.id === m.id);
    if (!ax || ax.absent) continue;
    sum += ax.value * m.weight;
    wsum += m.weight;
  }
  if (wsum <= 0) return 0;
  return Math.round((sum / wsum) * 10) / 10;
}

export function compareByReadiness(a: Agent, b: Agent): number {
  return compositeFromAxes(computeAxes(b)) - compositeFromAxes(computeAxes(a));
}

export function scoreAgent(
  agent: Agent,
  opts?: { isGenesisSpecialist?: boolean },
): MarketplaceScorecard {
  const axes = computeAxes(agent);
  const composite = compositeFromAxes(axes);
  return {
    agentKey: `${agent.chain_id}:${agent.token_id}`,
    name: agent.name || `Agent #${agent.token_id}`,
    chainId: agent.chain_id,
    tokenId: agent.token_id,
    href: `/agents/${agent.chain_id}/${agent.token_id}`,
    imageUrl: agent.image_url,
    axes,
    composite,
    isGenesisSpecialist: Boolean(opts?.isGenesisSpecialist),
  };
}

function averageAxes(cards: MarketplaceScorecard[]): ScoreAxis[] {
  if (cards.length === 0) {
    return AXIS_META.map((m) => ({
      id: m.id,
      label: m.label,
      short: m.short,
      value: 0,
      source: "no sample",
    }));
  }
  return AXIS_META.map((m) => {
    const present = cards
      .map((c) => c.axes.find((a) => a.id === m.id))
      .filter((ax): ax is ScoreAxis => ax != null && !ax.absent);
    if (present.length === 0) {
      return {
        id: m.id,
        label: m.label,
        short: m.short,
        value: 0,
        source: "Unrated — no sample",
        absent: true,
      };
    }
    const avg =
      present.reduce((s, ax) => s + ax.value, 0) / present.length;
    return {
      id: m.id,
      label: m.label,
      short: m.short,
      value: Math.round(avg * 10) / 10,
      source: `avg of ${present.length} agents`,
    };
  });
}

/**
 * Pull partner data centre (8004scan) + score for marketplace dashboard.
 */
export async function getMarketplaceDashboardSnapshot(
  topN = 6,
): Promise<MarketplaceDashboardSnapshot> {
  const endpoint =
    process.env.SCAN_API_BASE?.replace(/\/$/, "") ||
    "https://8004scan.io/api/v1/public";

  // One partner list + stats — keep dashboard fast
  const [stats, page1] = await Promise.all([
    getStatsSafe(),
    listAgentsSafe({
      chainId: BSC_CHAIN_ID,
      page: 1,
      limit: 36,
      sortBy: "total_score",
      sortOrder: "desc",
    }),
  ]);

  const partnerAgents = dedupeAgents([...(page1.data || [])]);

  // Include Genesis specialists as scorecards too (local catalog)
  const genesisCards = allGenesisAgents().map((g) => {
    const card = genesisToAgentCard(g);
    const scored = scoreAgent(card, { isGenesisSpecialist: true });
    // Prefer marketplace specialist URL over generic token route
    scored.href = `/genesis/${g.slug}`;
    // Seed slightly stronger commerce/trust for hire-ready specialists
    scored.axes = scored.axes.map((ax) => {
      if (ax.id === "commerce") {
        return { ...ax, value: Math.min(100, ax.value + 25), source: "marketplace specialist · hire-ready" };
      }
      if (ax.id === "trust") {
        return { ...ax, value: Math.min(100, ax.value + 20), source: "operated by Genesis" };
      }
      return ax;
    });
    scored.composite = compositeFromAxes(scored.axes);
    return scored;
  });

  const partnerCards = partnerAgents.map((a) =>
    scoreAgent(a, { isGenesisSpecialist: false }),
  );

  // Prefer partner cards for market average; mix specialists into top list
  const marketAxes = averageAxes(
    partnerCards.length ? partnerCards : genesisCards,
  );
  const marketComposite = compositeFromAxes(marketAxes);

  const top = [...partnerCards, ...genesisCards]
    .sort((a, b) => b.composite - a.composite)
    .filter(
      (c, i, arr) => arr.findIndex((x) => x.agentKey === c.agentKey) === i,
    )
    .slice(0, topN);

  const err =
    partnerAgents.length === 0
      ? page1.error ||
        (genesisCards.length
          ? "Partner index empty — using By Genesis specialists"
          : "Partner index empty")
      : null;

  // sampleSize: prefer partner count; fall back to specialists so UI never thinks we have "nothing"
  const sampleSize =
    partnerAgents.length > 0 ? partnerAgents.length : genesisCards.length;

  return {
    fetchedAt: new Date().toISOString(),
    partner: {
      name: "8004scan",
      endpoint,
      totalAgentsIndexed: stats.data?.total_agents ?? null,
      totalFeedbacks: stats.data?.total_feedbacks ?? null,
    },
    marketAxes,
    marketComposite,
    top,
    sampleSize,
    error: err,
  };
}

export { AXIS_META };
