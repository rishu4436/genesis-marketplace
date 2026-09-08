/**
 * Hireable-catalog gate for 8004scan noise.
 * Hides collectible editions, Twitter-ensoul clones, and name-stutter spam
 * so browse / category / home can rank real agents.
 */

import type { Agent } from "./types";
import { isCloneBotName } from "./hire-class";
import { isPinnedLiveSeller } from "./third-party-sellers";

export type CatalogDropReason =
  | "empty"
  | "name-stutter"
  | "ticker-spam"
  | "ensoul-social"
  | "collectible-nft"
  | "prompt-dump"
  | "off-job"
  | "test-stub"
  | "vanity-handle";

const TICKER_NAME =
  /^(8004ai|402ai|uuuai\d*|agentsai|onehaai|biuai)\b/i;

const COLLECTIBLE_NAME =
  /^(bort)\b|#\d{3,}\b/i;

const COLLECTIBLE_DESC =
  /yi he nexus|bap-578|3d interactive agent|edition\s+\d+\s*\/\s*\d+|cz series genesis/i;

const ENSOUL =
  /\bensoul\b/i;

const PROMPT_DUMP =
  /^(an evoevo ai agent)|you are an elite intp|when processing any crypto prediction/i;

const OFF_JOB =
  /unibase|hinami|ヒナミ|shitcoin|shitscreener|wow gold|kansas city|white swan|clawdbot|poet screener|grindingpoet|hodlai|energy grid for silicon|epstein|world of warcraft|draw\.io diagram|football odds/i;

/** Handle-as-name spam: toly.me, bobo.me, login.me */
const VANITY_HANDLE = /^[a-z0-9_-]{2,20}\.(me|xyz|eth|sol|ai)$/i;

function hay(agent: Agent): { name: string; desc: string } {
  return {
    name: (agent.name || "").trim(),
    desc: (agent.description || "").trim(),
  };
}

/** Description is just the name pasted over and over. */
export function isNameStutter(name: string, description: string): boolean {
  const n = name.trim();
  const d = description.trim();
  if (n.length < 3 || d.length < n.length * 3) return false;
  const needle = n.toLowerCase();
  const haystack = d.toLowerCase();
  let hits = 0;
  let from = 0;
  while (hits < 6) {
    const i = haystack.indexOf(needle, from);
    if (i < 0) break;
    hits += 1;
    from = i + needle.length;
  }
  if (hits >= 6) return true;
  const compact = d.replace(/\s+/g, "").toLowerCase();
  const token = n.replace(/\s+/g, "").toLowerCase();
  return token.length >= 4 && compact.includes(token.repeat(3));
}

export function catalogDropReason(agent: Agent): CatalogDropReason | null {
  const { name, desc } = hay(agent);
  if (isCloneBotName(name, desc)) return "test-stub";
  if (isPinnedLiveSeller(agent.chain_id, agent.token_id)) return null;
  if (agent.probe_status === "alive") return null;
  if (!name) return "empty";
  if (name.length <= 2 && !agent.is_verified) return "empty";
  if (/^\d+$/.test(name) || /^[?¿\s._-]+$/.test(name)) return "empty";
  if (/^agentscan agent$/i.test(name)) return "ticker-spam";

  if (TICKER_NAME.test(name)) return "ticker-spam";
  if (VANITY_HANDLE.test(name)) return "vanity-handle";
  if (/^test\.agent$/i.test(name) || /^test\./i.test(name) || /test\.agent/i.test(name)) {
    return "test-stub";
  }
  if (isNameStutter(name, desc)) return "name-stutter";

  if (ENSOUL.test(name) || ENSOUL.test(desc) || /^@[\w.]+/.test(name)) {
    return "ensoul-social";
  }

  if (
    COLLECTIBLE_NAME.test(name) ||
    COLLECTIBLE_DESC.test(desc) ||
    (/\b(legendary|epic|rare|uncommon)-tier\b/i.test(desc) &&
      /edition\s+\d+/i.test(desc))
  ) {
    return "collectible-nft";
  }

  if (PROMPT_DUMP.test(desc)) return "prompt-dump";
  if (OFF_JOB.test(name) || OFF_JOB.test(desc)) return "off-job";

  const a2a = (agent.a2a_endpoint || "").trim();
  if (
    a2a &&
    /8004scan\.io\/api|api\.8004scan/i.test(a2a)
  ) {
    return "off-job";
  }
  if (
    desc.length < 40 &&
    !agent.is_verified &&
    !/\b(pancake|venus|yield|grid|lp|rebalance|liquidity|health factor|apr)\b/i.test(
      `${name} ${desc}`,
    )
  ) {
    return "empty";
  }

  return null;
}

export function isHireableCatalogAgent(agent: Agent): boolean {
  return catalogDropReason(agent) == null;
}

export function filterHireableCatalog(agents: Agent[]): Agent[] {
  return agents.filter(isHireableCatalogAgent);
}

export function catalogFilterStats(agents: Agent[]): {
  kept: Agent[];
  hidden: number;
  raw: number;
} {
  const kept = filterHireableCatalog(agents);
  return { kept, hidden: agents.length - kept.length, raw: agents.length };
}
