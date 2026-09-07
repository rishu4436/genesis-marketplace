/**
 * Shared q/search matching for /hire and GET /api/v1/agents.
 * Nonsense queries must return an empty/filtered set, not the full catalog.
 */

import type { Agent } from "./types";
import { agentMatchesQuery } from "./agent-rank";

export type CatalogQueryFields = {
  name?: string | null;
  slug?: string | null;
  tagline?: string | null;
  description?: string | null;
  skills?: string[] | null;
  protocols?: string[] | null;
  tokenId?: string | number | null;
  categoryId?: string | null;
};

export function catalogRecordMatchesQuery(
  rec: CatalogQueryFields,
  q: string,
): boolean {
  const raw = q.trim();
  if (!raw) return true;
  const agent: Agent = {
    id: rec.slug || String(rec.tokenId || ""),
    agent_id: String(rec.tokenId || rec.slug || ""),
    token_id: String(rec.tokenId || rec.slug || ""),
    chain_id: 56,
    name: rec.name || rec.slug || "",
    description: [
      rec.tagline,
      rec.description,
      rec.slug,
      rec.categoryId,
      ...(rec.skills || []),
    ]
      .filter(Boolean)
      .join(" "),
    supported_protocols: rec.protocols || rec.skills || undefined,
  };
  return agentMatchesQuery(agent, raw);
}
