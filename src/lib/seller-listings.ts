/**
 * Seller listings — two gates.
 * Indexed: wallet owns the ERC-8004 token.
 * Hireable: live A2A probe + one of four job SKUs.
 */

import { promises as fs } from "fs";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import type { Agent } from "./types";
import { kvCmd } from "./kv";
import { skuForCategory } from "./desk";
import { isDirectoryLeak, isPublicHireableUrl } from "./hire-class";
import type { SellerListing } from "./seller-listing-types";

export type { SellerGate, SellerListing } from "./seller-listing-types";

const memory = new Map<string, SellerListing>();
let diskLoaded = false;

function dir() {
  return path.join(process.cwd(), "data", "seller-listings");
}

function fileFor(id: string) {
  return path.join(dir(), `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
}

function newId() {
  return `sl_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
}

function tokenKey(chainId: number, tokenId: string) {
  return `${chainId}:${String(tokenId)}`;
}

function loadDiskSync() {
  if (diskLoaded) return;
  diskLoaded = true;
  try {
    const files = readdirSync(dir());
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const row = JSON.parse(
          readFileSync(path.join(dir(), f), "utf8"),
        ) as SellerListing;
        if (row?.id) memory.set(row.id, row);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* no dir yet */
  }
}

export async function hydrateSellerListings(): Promise<void> {
  loadDiskSync();
  const raw = await kvCmd<string>("GET", "genesis:listings:index");
  if (!raw) return;
  try {
    const ids = JSON.parse(raw) as string[];
    for (const id of ids.slice(0, 200)) {
      if (memory.has(id)) continue;
      const row = await kvCmd<string>("GET", `genesis:listing:${id}`);
      if (!row) continue;
      try {
        const listing = JSON.parse(row) as SellerListing;
        if (listing?.id) memory.set(listing.id, listing);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* ignore */
  }
}

export function allSellerListings(): SellerListing[] {
  loadDiskSync();
  return [...memory.values()];
}

export function getListing(id: string): SellerListing | null {
  loadDiskSync();
  return memory.get(id) || null;
}

export function getListingByToken(
  chainId: number,
  tokenId: string | number,
): SellerListing | null {
  loadDiskSync();
  const key = tokenKey(chainId, String(tokenId));
  for (const row of memory.values()) {
    if (tokenKey(row.chainId, row.tokenId) === key) return row;
  }
  return null;
}

export function listingsForAccount(accountId: string): SellerListing[] {
  return allSellerListings().filter((r) => r.accountId === accountId);
}

export function listingsForWallet(wallet: string): SellerListing[] {
  const w = wallet.trim().toLowerCase();
  return allSellerListings().filter(
    (r) => r.ownerAddress.toLowerCase() === w,
  );
}

export async function saveListing(
  listing: SellerListing,
): Promise<SellerListing> {
  listing.updatedAt = new Date().toISOString();
  memory.set(listing.id, listing);
  try {
    await fs.mkdir(dir(), { recursive: true });
    await fs.writeFile(fileFor(listing.id), JSON.stringify(listing, null, 2));
  } catch {
    /* memory still holds */
  }
  await kvCmd("SET", `genesis:listing:${listing.id}`, JSON.stringify(listing));
  const ids = [...new Set(allSellerListings().map((r) => r.id))];
  await kvCmd("SET", "genesis:listings:index", JSON.stringify(ids.slice(0, 400)));
  return listing;
}

export function createListingDraft(opts: {
  chainId: number;
  tokenId: string;
  ownerAddress: string;
  accountId: string;
  name?: string;
}): SellerListing {
  const existing = getListingByToken(opts.chainId, opts.tokenId);
  if (existing) {
    return {
      ...existing,
      ownerAddress: opts.ownerAddress,
      accountId: opts.accountId,
      name: opts.name || existing.name,
    };
  }
  return {
    id: newId(),
    chainId: opts.chainId,
    tokenId: String(opts.tokenId),
    ownerAddress: opts.ownerAddress,
    accountId: opts.accountId,
    name: opts.name || `Agent #${opts.tokenId}`,
    categoryId: null,
    a2aUrl: "",
    youSend: "",
    youGet: "",
    lockU: null,
    quoteOnly: true,
    gate: "indexed",
    claimedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function listingToAgent(row: SellerListing): Agent {
  const sku = row.categoryId ? skuForCategory(row.categoryId) : undefined;
  const desc = [
    sku?.job,
    row.youGet,
    row.youSend,
    row.quoteOnly ? "Quote on hire." : row.lockU ? `${row.lockU} $U optional lock.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    id: `seller:${row.chainId}:${row.tokenId}`,
    agent_id: `${row.chainId}:${row.tokenId}`,
    token_id: row.tokenId,
    chain_id: row.chainId,
    owner_address: row.ownerAddress,
    name: row.name,
    description: desc || `Seller listing #${row.tokenId}`,
    a2a_endpoint: row.a2aUrl || undefined,
    census_category: row.categoryId || undefined,
    probe_status: row.gate === "hireable" ? "alive" : undefined,
    desk_live: row.gate === "hireable",
    quote_only: row.quoteOnly,
    list_lock_u: row.lockU || undefined,
    you_send: row.youSend || undefined,
    you_get: row.youGet || undefined,
    last_probe_at: row.probeAt,
    supported_protocols: ["A2A", "ERC-8183"],
    total_score: row.gate === "hireable" ? 20 : 0,
    health_score: row.gate === "hireable" ? 80 : 0,
  };
}

export function hireableSellerAgents(): Agent[] {
  return allSellerListings()
    .filter((r) => r.gate === "hireable")
    .filter((r) => isPublicHireableUrl(r.a2aUrl))
    .map(listingToAgent)
    .filter((a) => !isDirectoryLeak(a));
}
