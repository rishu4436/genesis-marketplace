import type { Agent } from "./types";
import type { CategoryId } from "./categories";
import { CATEGORIES, matchCategory } from "./categories";
import { compareByScore } from "./agent-score";
import { destinationRank, isHireableListing } from "./hire-class";
import { toHundredPointScale } from "./feedback-score";
import { compareByReadiness } from "./marketplace-score";

/** Higher = better fit for marketplace ranking */
export function rankScore(agent: Agent, categoryId?: CategoryId): number {
  let score = 0;

  score += (agent.total_score ?? 0) * 2;
  score += (agent.average_score ?? 0) * 20;
  score += Math.min(agent.total_feedbacks ?? 0, 50) * 3;
  score += Math.min(agent.star_count ?? 0, 100);
  if (agent.is_verified) score += 40;
  if (agent.x402_supported) score += 25;
  if (agent.supported_protocols?.length) {
    score += agent.supported_protocols.length * 8;
  }
  if (agent.description && agent.description.length > 40) score += 15;
  if (agent.image_url) score += 5;
  if (agent.health_score != null) score += agent.health_score;

  if (categoryId) {
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    if (cat) {
      const hay = `${agent.name} ${agent.description}`.toLowerCase();
      for (const kw of cat.keywords) {
        if (hay.includes(kw.toLowerCase())) score += 35;
      }
    }
  }

  return score;
}

export function sortAgents(
  agents: Agent[],
  opts?: { categoryId?: CategoryId; mode?: "rank" | "score" | "newest" | "ratings" },
): Agent[] {
  const mode = opts?.mode ?? "rank";
  const copy = [...agents];

  copy.sort((a, b) => {
    if (mode === "newest") {
      const tb = Date.parse(String(b.created_at || "")) || 0;
      const ta = Date.parse(String(a.created_at || "")) || 0;
      if (tb !== ta) return tb - ta;
      return Number(b.token_id || 0) - Number(a.token_id || 0);
    }
    if (mode === "ratings") {
      const aRated = (a.total_feedbacks ?? 0) > 0;
      const bRated = (b.total_feedbacks ?? 0) > 0;
      if (aRated !== bRated) return bRated ? 1 : -1;
      const avg =
        toHundredPointScale(b.average_score) -
        toHundredPointScale(a.average_score);
      if (avg !== 0) return avg;
      return (b.total_feedbacks ?? 0) - (a.total_feedbacks ?? 0);
    }
    if (mode === "score") {
      const ready = compareByReadiness(a, b);
      if (ready !== 0) return ready;
      return compareByScore(a, b);
    }
    const dest = destinationRank(b) - destinationRank(a);
    if (dest !== 0 && !opts?.categoryId) return dest;
    return rankScore(b, opts?.categoryId) - rankScore(a, opts?.categoryId);
  });

  return copy;
}

export function agentMatchesQuery(agent: Agent, q: string): boolean {
  return queryMatchScore(agent, q) > 0;
}

/** Higher = closer match. 0 = no match (do not list). */
export function queryMatchScore(agent: Agent, q: string): number {
  const raw = q.trim().toLowerCase();
  if (!raw) return 1;
  const name = (agent.name || "").toLowerCase();
  const desc = (agent.description || "").toLowerCase();
  const token = String(agent.token_id || "");
  const hay = `${name} ${desc} ${token} ${(agent.supported_protocols || []).join(" ")}`.toLowerCase();
  if (raw.length < 3) {
    if (name.startsWith(raw) || token === raw) return 40;
    const words = `${name} ${desc}`.split(/[^a-z0-9]+/);
    if (words.includes(raw)) return 30;
    return 0;
  }
  let s = 0;
  if (name === raw) s += 120;
  if (name.includes(raw)) s += 80;
  if (token === raw) s += 90;
  if (hay.includes(raw)) s += 40;
  const tokens = raw.split(/[^a-z0-9]+/i).filter((t) => t.length >= 2);
  if (tokens.length > 1 && tokens.every((t) => hay.includes(t))) s += 30;
  if (s === 0 && raw.length >= 3) {
    const cat = CATEGORIES.find((c) =>
      c.keywords.some(
        (k) => k.toLowerCase() === raw || raw.includes(k.toLowerCase()),
      ),
    );
    if (cat) {
      const id = matchCategory(agent.name || "", agent.description || "");
      if (id === cat.id) s += 25;
    }
  }
  return s;
}

export function filterAgents(
  agents: Agent[],
  filters: {
    x402?: boolean;
    verified?: boolean;
    hasRatings?: boolean;
    live?: boolean;
    q?: string;
  },
): Agent[] {
  let out = agents;
  if (filters.x402) out = out.filter((a) => a.x402_supported);
  if (filters.verified) out = out.filter((a) => a.is_verified);
  if (filters.live) out = out.filter((a) => isHireableListing(a));
  if (filters.hasRatings) out = out.filter((a) => (a.total_feedbacks ?? 0) > 0);
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    out = out.filter((a) => agentMatchesQuery(a, q));
  }
  return out;
}
