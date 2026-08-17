/**
 * 8004scan feedback scores are usually 0–100.
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
