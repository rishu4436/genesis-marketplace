import type { Agent } from "./types";

/**
 * Single source of truth for marketplace "Score" badge + Sort by score.
 *
 * 8004scan fields:
 * - total_score: composite marketplace score (often ~0–60+)
 * - average_score: feedback average 0–100 when reviews exist
 *
 * We sort and display the SAME number so page 1 is always ≥ page 2.
 * Prefer total_score (what the index ranks by); if missing, use average_score.
 */
export function agentScore(agent: Agent): number {
  const total = toNum(agent.total_score);
  if (total > 0) return total;
  const avg = toNum(agent.average_score);
  if (avg > 0) return avg;
  return 0;
}

export function formatAgentScore(agent: Agent): string {
  const s = agentScore(agent);
  if (s <= 0) return "New";
  // Keep one decimal if not integer-looking
  const label = Number.isInteger(s) || Math.abs(s - Math.round(s)) < 0.05
    ? String(Math.round(s))
    : s.toFixed(1);
  return `Score ${label}`;
}

/** Descending score sort — stable, pure numeric */
export function compareByScore(a: Agent, b: Agent): number {
  const d = agentScore(b) - agentScore(a);
  if (d !== 0) return d;
  // stable tie-breaks
  const fb = toNum(b.total_feedbacks) - toNum(a.total_feedbacks);
  if (fb !== 0) return fb;
  const st = toNum(b.star_count) - toNum(a.star_count);
  if (st !== 0) return st;
  return String(a.token_id).localeCompare(String(b.token_id));
}

function toNum(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
