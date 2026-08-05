import { getCategory, type CategoryId, CATEGORIES } from "./categories";
import {
  dedupeAgents,
  searchAgentsSafe,
  listAgentsSafe,
  BSC_CHAIN_ID,
} from "./scan";
import { sortAgents, rankScore } from "./agent-rank";
import type { Agent } from "./types";

function textMatch(agent: Agent, keywords: string[]): number {
  const hay = `${agent.name || ""} ${agent.description || ""}`.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (hay.includes(kw.toLowerCase())) hits += 1;
  }
  return hits;
}

/**
 * Multi-strategy fetch so each of the 4 categories has real listings even
 * when semantic search is flaky.
 */
export async function getAgentsForCategory(
  categoryId: CategoryId,
  limit = 12,
): Promise<{ agents: Agent[]; source: string; error: string | null }> {
  const cat = getCategory(categoryId);
  if (!cat) return { agents: [], source: "none", error: "Unknown category" };

  const collected: Agent[] = [];
  const errors: string[] = [];

  // 1) Semantic search (best when API is healthy)
  const semantic = await Promise.all(
    cat.searchQueries.map((q) =>
      searchAgentsSafe({ q, limit: 20, chainId: BSC_CHAIN_ID }),
    ),
  );
  for (const s of semantic) {
    if (s.error) errors.push(s.error);
    if (s.data) collected.push(...s.data);
  }

  // 2) Keyword list search per keyword
  const keywordLookups = await Promise.all(
    cat.keywords.slice(0, 5).map((kw) =>
      listAgentsSafe({
        chainId: BSC_CHAIN_ID,
        search: kw,
        limit: 20,
        sortBy: "total_score",
        sortOrder: "desc",
      }),
    ),
  );
  for (const k of keywordLookups) {
    if (k.error) errors.push(k.error);
    if (k.data) collected.push(...k.data);
  }

  let agents = dedupeAgents(collected);

  // Prefer agents that actually match category keywords
  const matched = agents.filter((a) => textMatch(a, cat.keywords) > 0);
  if (matched.length >= 3) {
    agents = matched;
  }

  agents = sortAgents(agents, { categoryId, mode: "rank" }).slice(0, limit);

  // 3) Last resort: top scored BSC agents (still show marketplace density)
  if (agents.length < 4) {
    const top = await listAgentsSafe({
      chainId: BSC_CHAIN_ID,
      limit: 40,
      sortBy: "total_score",
      sortOrder: "desc",
    });
    if (top.data?.length) {
      const extra = sortAgents(dedupeAgents([...agents, ...top.data]), {
        categoryId,
        mode: "rank",
      });
      // Keep any with keyword hit first, then fill
      const withHits = extra.filter((a) => textMatch(a, cat.keywords) > 0);
      const without = extra.filter((a) => textMatch(a, cat.keywords) === 0);
      agents = dedupeAgents([...withHits, ...without]).slice(0, limit);
    }
    if (top.error) errors.push(top.error);
  }

  const source =
    matched.length >= 3
      ? "category-match"
      : agents.length
        ? "mixed"
        : "empty";

  return {
    agents,
    source,
    error: agents.length ? null : errors[0] || "No agents found",
  };
}

/** Snapshot of all 4 categories for home / diversity proof */
export async function getAllCategorySnapshots(perCategory = 4) {
  const entries = await Promise.all(
    CATEGORIES.map(async (cat) => {
      const res = await getAgentsForCategory(cat.id, perCategory);
      return {
        category: cat,
        agents: res.agents,
        source: res.source,
        error: res.error,
        topScore: res.agents[0] ? rankScore(res.agents[0], cat.id) : 0,
      };
    }),
  );
  return entries;
}

export async function getRelatedAgents(
  agent: Agent,
  limit = 4,
): Promise<Agent[]> {
  const fromName = agent.name?.split(/\s+/).slice(0, 3).join(" ") || "trading";
  const search = await searchAgentsSafe({
    q: fromName,
    limit: 12,
    chainId: agent.chain_id || BSC_CHAIN_ID,
  });
  const list = await listAgentsSafe({
    chainId: agent.chain_id || BSC_CHAIN_ID,
    limit: 12,
    sortBy: "total_score",
    sortOrder: "desc",
    search: fromName.split(" ")[0],
  });

  const pool = dedupeAgents([
    ...(search.data || []),
    ...(list.data || []),
  ]).filter(
    (a) =>
      !(
        a.chain_id === agent.chain_id &&
        String(a.token_id) === String(agent.token_id)
      ),
  );

  return sortAgents(pool, { mode: "rank" }).slice(0, limit);
}
