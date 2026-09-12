/**
 * Seller claim store — owners assert control of an ERC-8004 listing.
 * Demo-grade: memory + disk (same pattern as jobs).
 */

import { promises as fs } from "fs";
import path from "path";
import { kvCmd } from "./kv";

export type SellerClaim = {
  id: string;
  chainId: number;
  tokenId: string;
  ownerAddress: string;
  displayName: string;
  skills: string[];
  priceUsd: number;
  serviceUrl?: string;
  x402: boolean;
  pitch: string;
  claimedAt: string;
  status: "pending" | "listed";
};

const memory = new Map<string, SellerClaim>();

function dir() {
  return path.join(process.cwd(), "data", "claims");
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

export async function saveClaim(claim: SellerClaim): Promise<SellerClaim> {
  memory.set(claim.id, claim);
  try {
    await ensure();
    await fs.writeFile(fileFor(claim.id), JSON.stringify(claim, null, 2), "utf8");
  } catch {
    /* memory still holds */
  }
  await kvCmd("SET", `genesis:claim-row:${claim.id}`, JSON.stringify(claim));
  return claim;
}

export async function listClaims(limit = 50): Promise<SellerClaim[]> {
  try {
    await ensure();
    const files = await fs.readdir(dir());
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(dir(), f), "utf8");
        const c = JSON.parse(raw) as SellerClaim;
        memory.set(c.id, c);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* disk unavailable */
  }
  return [...memory.values()]
    .sort(
      (a, b) =>
        new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime(),
    )
    .slice(0, limit);
}

export function newClaimId() {
  return `claim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
