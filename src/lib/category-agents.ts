import { getCategory, type CategoryId } from "./categories";
import { dedupeAgents, searchAgents, listAgents } from "./scan";
import type { Agent } from "./types";

/**
 * Fetch agents for a hackathon category using semantic search + keyword list.
 * Falls back to general BSC listing if search is thin.
 */
export async function getAgentsForCategory(
  categoryId: CategoryId,
  limit = 12,
): Promise<Agent[]> {
  const cat = getCategory(categoryId);
  if (!cat) return [];

  const batches = await Promise.allSettled(
    cat.searchQueries.map((q) =>
      searchAgents({ q, limit: Math.max(limit, 10), chainId: 56 }),
    ),
  );

  const collected: Agent[] = [];
  for (const b of batches) {
    if (b.status === "fulfilled" && Array.isArray(b.value.data)) {
      collected.push(...b.value.data);
    }
  }

  let agents = dedupeAgents(collected).slice(0, limit);

  if (agents.length < 4) {
    try {
      const fallback = await listAgents({
        chainId: 56,
        limit: 30,
        sortBy: "total_score",
        sortOrder: "desc",
        search: cat.keywords[0],
      });
      agents = dedupeAgents([...agents, ...(fallback.data || [])]).slice(
        0,
        limit,
      );
    } catch {
      /* keep what we have */
    }
  }

  return agents;
}
