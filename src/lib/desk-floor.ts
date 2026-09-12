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
import { hireableSellerAgents } from "./seller-listings";
import {
  isGenesisListing,
  isHireableListing,
  matchingGenesisSlug,
} from "./hire-class";

export function deskFloorAgents(): Agent[] {
  const genesis = allGenesisAgents().map((g) => genesisToAgentCard(g));
  const probed = hireableBscAsAgents();
  const live = LIVE_SELLERS.map((s) => featuredAsAgent(s));
  const byToken = new Map(probed.map((a) => [String(a.token_id), a]));
  for (const a of live) {
    const p = byToken.get(String(a.token_id));
    if (!p) continue;
    a.last_probe_at = a.last_probe_at || p.last_probe_at;
    a.last_probe_kind = a.last_probe_kind || p.last_probe_kind;
    a.a2a_rpc = a.a2a_rpc || p.a2a_rpc;
    a.a2a_card_url = a.a2a_card_url || p.a2a_card_url;
  }
  const sellers = hireableSellerAgents();
  return dedupeAgents([...genesis, ...live, ...probed, ...sellers]).filter(
    isHireableListing,
  );
}

/** Third-party hireable rows for one job shelf (Genesis is passed separately). */
export function deskFloorForCategory(categoryId: CategoryId): Agent[] {
  const seen = new Set<string>();
  const out: Agent[] = [];
  for (const a of deskFloorAgents()) {
    if (isGenesisListing(a) || matchingGenesisSlug(a)) continue;
    const id = String(a.token_id || "");
    if (!id || seen.has(id)) continue;
    const cat =
      (a.census_category as CategoryId | undefined) ||
      categorizeHireable(a.name || "", a.description || "");
    if (cat !== categoryId) continue;
    seen.add(id);
    out.push(a);
  }
  return out;
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
