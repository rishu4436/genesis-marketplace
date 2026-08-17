/**
 * 8004scan rating scores are usually 0–100.
 * A few sources use 0–5. Never print a 60 as "60/5".
 */

import type { Feedback } from "./types";

export function formatFeedbackScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(Number(score))) return "—";
  const n = Number(score);
  if (n <= 0) return "—";
  if (n <= 5) {
    const label = Number.isInteger(n) ? String(n) : n.toFixed(1);
    return `${label}/5`;
  }
  if (n <= 10) {
    const label = Number.isInteger(n) ? String(n) : n.toFixed(1);
    return `${label}/10`;
  }
  return `${Math.round(n)}/100`;
}

export function formatAverageScore(score: number | null | undefined): string {
  return formatFeedbackScore(score);
}

/**
 * Map a partner/local average onto 0–100 for the rating pentagon.
 * 8004scan is usually 0–100; Genesis specialists (and a few rows) use 0–5.
 * Never treat 4.8 as "4.8 out of 100".
 */
export function toHundredPointScale(
  score: number | null | undefined,
): number {
  if (score == null || !Number.isFinite(Number(score))) return 0;
  const n = Number(score);
  if (n <= 0) return 0;
  if (n <= 5) return Math.round((n / 5) * 1000) / 10;
  if (n <= 10) return Math.round((n / 10) * 1000) / 10;
  return Math.max(0, Math.min(100, n));
}

export function hasOnchainRating(agent: {
  total_feedbacks?: number;
  average_score?: number | null;
}): boolean {
  return (
    (agent.total_feedbacks ?? 0) > 0 &&
    toHundredPointScale(agent.average_score) > 0
  );
}

/** Real 8004scan average, or Unrated. Never invents a number. */
export function formatOnchainRating(agent: {
  total_feedbacks?: number;
  average_score?: number | null;
}): string {
  if (!hasOnchainRating(agent)) return "Unrated";
  return formatAverageScore(agent.average_score);
}

export function feedbackBelongsToAgent(
  f: Feedback,
  chainId: number,
  tokenId: string | number,
): boolean {
  const want = String(tokenId);
  const have = f.token_id != null ? String(f.token_id) : "";
  if (have && have === want) return true;
  const nested = (f as Feedback & { agent?: { token_id?: string | number } })
    .agent?.token_id;
  if (nested != null && String(nested) === want) return true;
  if (f.chain_id != null && Number(f.chain_id) !== Number(chainId)) {
    return false;
  }
  // No token on the row — don't attach it to a random agent
  return false;
}
