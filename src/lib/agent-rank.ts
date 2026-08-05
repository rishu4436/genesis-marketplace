import type { Agent } from "./types";
import type { CategoryId } from "./categories";
import { CATEGORIES } from "./categories";

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
  opts?: { categoryId?: CategoryId; mode?: "rank" | "score" | "newest" | "feedback" },
): Agent[] {
  const mode = opts?.mode ?? "rank";
  const copy = [...agents];

  copy.sort((a, b) => {
    if (mode === "newest") {
      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      );
    }
    if (mode === "feedback") {
      return (b.total_feedbacks ?? 0) - (a.total_feedbacks ?? 0);
    }
    if (mode === "score") {
      return (b.total_score ?? 0) - (a.total_score ?? 0);
    }
    return rankScore(b, opts?.categoryId) - rankScore(a, opts?.categoryId);
  });

  return copy;
}

export function filterAgents(
  agents: Agent[],
  filters: {
    x402?: boolean;
    verified?: boolean;
    hasFeedback?: boolean;
    q?: string;
  },
): Agent[] {
  let out = agents;
  if (filters.x402) out = out.filter((a) => a.x402_supported);
  if (filters.verified) out = out.filter((a) => a.is_verified);
  if (filters.hasFeedback) out = out.filter((a) => (a.total_feedbacks ?? 0) > 0);
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    out = out.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        String(a.token_id).includes(q),
    );
  }
  return out;
}
