/**
 * Task-fit score: how well an agent matches a buyer's brief (0–100).
 * Used on agent pages and match results for informed hire decisions.
 */

import type { CategoryId } from "./categories";
import { matchCategory } from "./categories";
import type { GenesisAgent } from "./genesis-agents";
import type { Agent } from "./types";

export type TaskFitResult = {
  score: number;
  label: string;
  reasons: string[];
};

export function taskFitForGenesis(
  agent: GenesisAgent,
  task: string,
): TaskFitResult {
  const q = task.toLowerCase();
  const reasons: string[] = [];
  let score = 40;

  const detected = matchCategory(agent.name, task) || matchCategory("", task);
  if (detected === agent.categoryId) {
    score += 35;
    reasons.push("Category match for this job type");
  } else if (detected) {
    score += 8;
    reasons.push("Related category — verify skills");
  }

  let skillHits = 0;
  for (const s of agent.skills) {
    const words = s.toLowerCase().split(/\s+/);
    if (words.some((w) => w.length > 3 && q.includes(w))) skillHits += 1;
  }
  score += Math.min(15, skillHits * 5);
  if (skillHits) reasons.push(`${skillHits} skill keyword hit(s)`);

  if (agent.pcsRelated && (q.includes("pancake") || q.includes("pcs") || q.includes("lp"))) {
    score += 8;
    reasons.push("PancakeSwap-aware specialist");
  }

  score += Math.max(0, 6 - agent.etaMinutes); // faster slight edge
  reasons.push(`~${agent.etaMinutes}m ETA · $${agent.basePriceUsd}`);

  score = Math.min(100, Math.round(score));
  return { score, label: fitLabel(score), reasons: reasons.slice(0, 4) };
}

export function taskFitForAgent(
  agent: Agent,
  task: string,
  categoryId?: CategoryId | null,
): TaskFitResult {
  const q = task.toLowerCase();
  const reasons: string[] = [];
  let score = 30;

  const detected =
    categoryId ||
    matchCategory(agent.name || "", agent.description || "") ||
    matchCategory("", task);

  const agentCat = matchCategory(agent.name || "", agent.description || "");
  if (detected && agentCat === detected) {
    score += 30;
    reasons.push(`Maps to ${detected}`);
  }

  if (agent.is_verified) {
    score += 12;
    reasons.push("Verified in index");
  }
  if (agent.x402_supported) {
    score += 8;
    reasons.push("x402 listed");
  }
  if ((agent.total_feedbacks ?? 0) > 0) {
    score += Math.min(12, (agent.total_feedbacks ?? 0) * 2);
    reasons.push(`${agent.total_feedbacks} ratings`);
  }

  const blob = `${agent.name} ${agent.description}`.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  const hits = words.filter((w) => blob.includes(w)).length;
  score += Math.min(15, hits * 3);

  score = Math.min(100, Math.round(score));
  return { score, label: fitLabel(score), reasons: reasons.slice(0, 4) };
}

function fitLabel(score: number): string {
  if (score >= 85) return "Excellent fit";
  if (score >= 70) return "Strong fit";
  if (score >= 55) return "Reasonable fit";
  if (score >= 40) return "Weak fit";
  return "Poor fit — compare others";
}
