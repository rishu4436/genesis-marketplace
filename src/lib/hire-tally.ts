/**
 * Desk counts: hireable vs not. Alive HTTP ≠ hireable.
 * Hireable = deskFloorAgents() so Browse, landing, and judge agree.
 */

import { allGenesisAgents } from "./genesis-agents";
import {
  fetchCensusAlive,
  peekCensusAlive,
  type CensusAliveStats,
} from "./census-alive";
import { loadHireableBsc } from "./hireable-bsc";
import { deskFloorAgents, deskFloorByCategory } from "./desk-floor";
import { isGenesisListing } from "./hire-class";
import type { HireTally } from "./hire-tally-types";
import type { Agent } from "./types";

export type { HireTally } from "./hire-tally-types";

function tallyFrom(census: {
  agents: Agent[];
  stats: CensusAliveStats;
} | null): HireTally {
  const file = loadHireableBsc();
  const floor = deskFloorAgents();
  const genesis = allGenesisAgents();
  const hireableIds = new Set(
    floor.map((a) => String(a.token_id || "")).filter((id) => /^\d+$/.test(id)),
  );

  const registered = census?.stats.registered || file.registered || 0;
  const endpointAlive =
    census?.stats.alive || file.endpointAlive || 0;
  const aliveNotHireable = census?.agents.length
    ? census.agents.filter((a) => !hireableIds.has(String(a.token_id))).length
    : Math.max(0, endpointAlive - hireableIds.size);

  return {
    registered,
    endpointAlive,
    hireable: hireableIds.size,
    genesis: genesis.length,
    liveThirdParty: floor.filter((a) => !isGenesisListing(a)).length,
    unhireableRegistered: Math.max(0, registered - hireableIds.size),
    aliveNotHireable,
    byCategory: deskFloorByCategory(),
    asOf: file.asOf || census?.stats.asOf || null,
  };
}

/** Sync. Uses last census if this process already fetched one. */
export function getHireTallyFast(): HireTally {
  return tallyFrom(peekCensusAlive());
}

export async function getHireTally(): Promise<HireTally> {
  return tallyFrom(await fetchCensusAlive());
}
