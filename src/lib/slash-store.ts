/**
 * Incident ledger for cooling — not a money slash.
 * Genesis specialists stay hireable at any stake.
 */

import { promises as fs } from "fs";
import path from "path";
import type { SellerIncident } from "./job-decision";

const memory = new Map<string, SellerIncident>();

function dir() {
  return path.join(process.cwd(), "data", "incidents");
}

function fileFor(id: string) {
  return path.join(dir(), `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
}

async function ensure() {
  try {
    await fs.mkdir(dir(), { recursive: true });
  } catch {
    /* ignore */
  }
}

export async function saveIncident(
  inc: SellerIncident,
): Promise<SellerIncident> {
  memory.set(inc.id, inc);
  try {
    await ensure();
    await fs.writeFile(fileFor(inc.id), JSON.stringify(inc, null, 2), "utf8");
  } catch {
    /* memory only */
  }
  return inc;
}

export async function listIncidents(
  slug?: string,
): Promise<SellerIncident[]> {
  try {
    await ensure();
    const files = await fs.readdir(dir());
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(dir(), f), "utf8");
        const inc = JSON.parse(raw) as SellerIncident;
        memory.set(inc.id, inc);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* disk unavailable */
  }
  const all = [...memory.values()];
  if (!slug) return all;
  return all.filter(
    (i) => i.genesisSlug === slug || i.sellerId === `genesis:${slug}`,
  );
}
