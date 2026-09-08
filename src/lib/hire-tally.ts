/**
 * Desk counts: hireable vs not. Alive HTTP ≠ hireable.
 */

import { allGenesisAgents } from "./genesis-agents";
import { fetchCensusAlive } from "./census-alive";
import { hireableBscAsAgents, loadHireableBsc } from "./hireable-bsc";
import type { HireTally } from "./hire-tally-types";

export type { HireTally } from "./hire-tally-types";

export async function getHireTally(): Promise<HireTally> {
  const file = loadHireableBsc();
  const probed = hireableBscAsAgents();
  const genesis = allGenesisAgents();
  const genesisIds = new Set(
    genesis
      .map((g) => String(g.tokenId || ""))
      .filter((id) => /^\d+$/.test(id)),
  );
  const probedIds = new Set(probed.map((a) => String(a.token_id)));
  const hireableIds = new Set<string>([...genesisIds, ...probedIds]);

  const census = await fetchCensusAlive();
  const registered = census.stats.registered || file.registered || 0;
  const endpointAlive = census.stats.alive || 0;
  const aliveNotHireable = census.agents.length
    ? census.agents.filter((a) => !hireableIds.has(String(a.token_id)))
        .length
    : Math.max(0, endpointAlive - hireableIds.size);

  return {
    registered,
    endpointAlive,
    hireable: hireableIds.size,
    genesis: genesis.length,
    liveThirdParty: [...probedIds].filter((id) => !genesisIds.has(id)).length,
    unhireableRegistered: Math.max(0, registered - hireableIds.size),
    aliveNotHireable,
    byCategory: { ...file.byCategory },
    asOf: file.asOf || census.stats.asOf || null,
  };
}
