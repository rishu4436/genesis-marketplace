/**
 * Hireable BSC floor: agents whose A2A/MCP actually answered a probe.
 * Built by scripts/probe-hireable-bsc.mjs into config/hireable-bsc.json.
 * Alive HTTP ≠ hireable. Uncategorized hireable stay on /browse, not a wrong shelf.
 */

import { readFileSync } from "fs";
import path from "path";
import type { Agent } from "./types";
import type { CategoryId } from "./categories";
import { isCloneBotName, isPublicHireableUrl } from "./hire-class";

export type HireableBscRow = {
  tokenId: string;
  chainId: 56;
  name: string;
  description: string;
  categoryId: CategoryId | null;
  a2a: string;
  probe: "a2a-card" | "a2a-rpc" | "mcp";
  latencyMs: number;
  owner?: string;
};

export type HireableBscFile = {
  asOf: string;
  registered: number;
  candidates: number;
  probedEndpoints: number;
  hireable: HireableBscRow[];
  byCategory: Record<CategoryId, number>;
  uncategorized: number;
  source: string;
};

let cached: HireableBscFile | null = null;

const SHELF_NEEDLES: Record<CategoryId, string[]> = {
  rebalancing: ["rebalanc", "lp range", "concentrated liquidity", "out of range"],
  "grid-trading": ["grid trad", "grid planner", "grid bot", "market making"],
  "yield-optimisation": [
    "yield",
    "apr",
    "apy",
    "fee tier",
    "farm",
    "vault",
  ],
  "health-factor": [
    "health factor",
    "liquidation",
    "borrow",
    "collateral ratio",
  ],
};

export function categorizeHireable(
  name: string,
  description: string,
  censusCategory?: string | null,
): CategoryId | null {
  const hay = `${name} ${description}`.toLowerCase();
  let best: { id: CategoryId; n: number } | null = null;
  for (const id of Object.keys(SHELF_NEEDLES) as CategoryId[]) {
    let n = 0;
    for (const kw of SHELF_NEEDLES[id]) {
      if (hay.includes(kw)) n += 1;
    }
    if (n > 0 && (!best || n > best.n)) best = { id, n };
  }
  if (best) return best.id;

  const mapped = (censusCategory || "").toLowerCase();
  if (mapped === "grid-trading" || mapped === "grid") return "grid-trading";
  if (mapped === "health-factor" || mapped === "health") return "health-factor";
  if (mapped === "yield" || mapped === "yield-optimisation") {
    return "yield-optimisation";
  }
  if (mapped === "rebalancing" || mapped === "rebalance") return "rebalancing";
  return null;
}

function isCloneBot(name: string, description: string): boolean {
  return isCloneBotName(name, description);
}

export function loadHireableBsc(): HireableBscFile {
  if (cached) return cached;
  const empty: HireableBscFile = {
    asOf: "",
    registered: 0,
    candidates: 0,
    probedEndpoints: 0,
    hireable: [],
    byCategory: {
      rebalancing: 0,
      "grid-trading": 0,
      "yield-optimisation": 0,
      "health-factor": 0,
    },
    uncategorized: 0,
    source: "none",
  };
  try {
    const p = path.join(process.cwd(), "config", "hireable-bsc.json");
    const raw = readFileSync(p, "utf8");
    cached = JSON.parse(raw) as HireableBscFile;
    return cached;
  } catch {
    return empty;
  }
}

export function hireableBscAsAgents(categoryId?: CategoryId): Agent[] {
  const file = loadHireableBsc();
  const rows = file.hireable.filter((r) => {
    if (r.probe === "mcp") return false;
    if (!isPublicHireableUrl(r.a2a)) return false;
    if (isCloneBot(r.name, r.description)) return false;
    const cat = r.categoryId || categorizeHireable(r.name, r.description);
    if (categoryId) return cat === categoryId;
    return Boolean(cat);
  }).map((r) => ({
      id: `hireable:56:${r.tokenId}`,
      agent_id: `56:${r.tokenId}`,
      token_id: r.tokenId,
      chain_id: 56,
      owner_address: r.owner,
      name: r.name,
      description: r.description,
      a2a_endpoint: r.a2a,
      supported_protocols:
        r.probe === "mcp" ? ["MCP"] : ["A2A", "ERC-8183"],
      probe_status: "alive" as const,
      probe_latency_ms: r.latencyMs,
      census_category: r.categoryId || undefined,
      health_score: 80,
    }));
  return rows;
}

export function hireableOwnerFor(
  chainId: number,
  tokenId: string | number,
): string | undefined {
  const row = loadHireableBsc().hireable.find(
    (r) =>
      Number(r.chainId) === Number(chainId) &&
      String(r.tokenId) === String(tokenId),
  );
  return row?.owner && /^0x[a-fA-F0-9]{40}$/.test(row.owner)
    ? row.owner
    : undefined;
}
