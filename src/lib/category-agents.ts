import { getCategory, type CategoryId, CATEGORIES } from "./categories";
import {
  dedupeAgents,
  searchAgentsSafe,
  listAgentsSafe,
  BSC_CHAIN_ID,
} from "./scan";
import { rankScore } from "./agent-rank";
import { compareByScore } from "./agent-score";
import { filterHireableCatalog } from "./catalog-quality";
import { featuredAsAgent, getFeaturedThirdParty } from "./third-party-sellers";
import type { Agent } from "./types";

function textMatch(agent: Agent, keywords: string[]): number {
  const hay = `${agent.name || ""} ${agent.description || ""}`.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (hay.includes(kw.toLowerCase())) hits += 1;
  }
  return hits;
}

export type CategoryAgentsResult = {
  agents: Agent[];
  totalMatched: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  source: string;
  error: string | null;
};

/**
 * Category shelf — limited partner calls so the page never hangs.
 */
export async function getAgentsForCategory(
  categoryId: CategoryId,
  opts: { page?: number; pageSize?: number } | number = {},
): Promise<CategoryAgentsResult> {
  const page =
    typeof opts === "number" ? 1 : Math.max(1, opts.page ?? 1);
  const pageSize =
    typeof opts === "number"
      ? Math.min(opts, 48)
      : Math.min(Math.max(opts.pageSize ?? 24, 6), 48);

  const cat = getCategory(categoryId);
  if (!cat) {
    return {
      agents: [],
      totalMatched: 0,
      page,
      pageSize,
      hasMore: false,
      source: "none",
      error: "Unknown category",
    };
  }

  const collected: Agent[] = [];
  const errors: string[] = [];

  // Bounded fan-out: 1 semantic query + 2 keyword lists + 1 top page
  const primaryQ = cat.searchQueries[0] || cat.shortName;
  const kw1 = cat.keywords[0];
  const kw2 = cat.keywords[1] || cat.keywords[0];

  const [semantic, listKw1, listKw2, top] = await Promise.all([
    searchAgentsSafe({ q: primaryQ, limit: 40, chainId: BSC_CHAIN_ID }),
    kw1
      ? listAgentsSafe({
          chainId: BSC_CHAIN_ID,
          search: kw1,
          limit: 40,
          page: 1,
          sortBy: "total_score",
          sortOrder: "desc",
        })
      : Promise.resolve({ data: null as Agent[] | null, error: null }),
    kw2
      ? listAgentsSafe({
          chainId: BSC_CHAIN_ID,
          search: kw2,
          limit: 40,
          page: 1,
          sortBy: "total_score",
          sortOrder: "desc",
        })
      : Promise.resolve({ data: null as Agent[] | null, error: null }),
    listAgentsSafe({
      chainId: BSC_CHAIN_ID,
      page: 1,
      limit: 48,
      sortBy: "total_score",
      sortOrder: "desc",
    }),
  ]);

  for (const r of [semantic, listKw1, listKw2, top]) {
    if (r.error) errors.push(r.error);
    if (r.data) collected.push(...r.data);
  }

  const pool = filterHireableCatalog(dedupeAgents(collected));

  const withHits = pool
    .filter((a) => textMatch(a, cat.keywords) > 0)
    .sort((a, b) => {
      const ha = textMatch(a, cat.keywords);
      const hb = textMatch(b, cat.keywords);
      if (hb !== ha) return hb - ha;
      return compareByScore(a, b);
    });
  const without = pool
    .filter((a) => textMatch(a, cat.keywords) === 0)
    .sort(compareByScore);
  let ranked = dedupeAgents([...withHits, ...without]);
  const featured = getFeaturedThirdParty(categoryId);
  if (featured) {
    ranked = dedupeAgents([featuredAsAgent(), ...ranked]);
  }

  const totalMatched = ranked.length;
  const start = (page - 1) * pageSize;
  const agents = ranked.slice(start, start + pageSize);
  const hasMore = start + pageSize < totalMatched;

  const source =
    withHits.length >= 4
      ? "category-match"
      : withHits.length > 0
        ? "mixed"
        : ranked.length
          ? "broad-index"
          : "empty";

  return {
    agents,
    totalMatched,
    page,
    pageSize,
    hasMore,
    source,
    error: agents.length ? null : errors[0] || "No agents found",
  };
}

export async function getAllCategorySnapshots(perCategory = 4) {
  const entries = await Promise.all(
    CATEGORIES.map(async (cat) => {
      const res = await getAgentsForCategory(cat.id, {
        page: 1,
        pageSize: perCategory,
      });
      return {
        category: cat,
        agents: res.agents,
        source: res.source,
        error: res.error,
        totalMatched: res.totalMatched,
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
  const [search, list] = await Promise.all([
    searchAgentsSafe({
      q: fromName,
      limit: 16,
      chainId: agent.chain_id || BSC_CHAIN_ID,
    }),
    listAgentsSafe({
      chainId: agent.chain_id || BSC_CHAIN_ID,
      limit: 16,
      sortBy: "total_score",
      sortOrder: "desc",
      search: fromName.split(" ")[0],
    }),
  ]);

  const pool = filterHireableCatalog(
    dedupeAgents([...(search.data || []), ...(list.data || [])]),
  ).filter(
    (a) =>
      !(
        a.chain_id === agent.chain_id &&
        String(a.token_id) === String(agent.token_id)
      ),
  );

  return pool.sort(compareByScore).slice(0, limit);
}
