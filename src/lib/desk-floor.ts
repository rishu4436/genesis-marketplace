/**
 * Single hireable set for Browse, tally, and category shelves.
 * Genesis + probed A2A + pinned live sellers. Not the ERC-8004 dump.
 */

import type { Agent } from "./types";
import type { CategoryId } from "./categories";
import { CATEGORIES } from "./categories";
import { dedupeAgents } from "./scan";
import { allGenesisAgents, genesisToAgentCard } from "./genesis-agents";
import { hireableBscAsAgents, categorizeHireable } from "./hireable-bsc";
import { featuredAsAgent, LIVE_SELLERS } from "./third-party-sellers";
import {
  isGenesisListing,
  isHireableListing,
  matchingGenesisSlug,
} from "./hire-class";

export function deskFloorAgents(): Agent[] {
  const genesis = allGenesisAgents().map((g) => genesisToAgentCard(g));
  const probed = hireableBscAsAgents();
  const live = LIVE_SELLERS.map((s) => featuredAsAgent(s));
  return dedupeAgents([...genesis, ...probed, ...live]).filter(
    isHireableListing,
  );
}

export function deskFloorByCategory(): Record<CategoryId, number> {
  const counts = Object.fromEntries(
    CATEGORIES.map((c) => [c.id, 0]),
  ) as Record<CategoryId, number>;
  const seen = new Set<string>();
  for (const g of allGenesisAgents()) {
    counts[g.categoryId] += 1;
    if (g.tokenId) seen.add(String(g.tokenId));
  }
  for (const a of deskFloorAgents()) {
    if (isGenesisListing(a) || matchingGenesisSlug(a)) continue;
    const id = String(a.token_id || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const cat =
      (a.census_category as CategoryId | undefined) ||
      categorizeHireable(a.name || "", a.description || "");
    if (cat) counts[cat] += 1;
  }
  return counts;
}
