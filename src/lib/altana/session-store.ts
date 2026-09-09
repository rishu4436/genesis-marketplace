/**
 * Persist Altana session records (marketplace UI + judge proof).
 * Session private keys stay server-side only (never returned to browser).
 */

import { promises as fs } from "fs";
import path from "path";

export type StoredAltanaSession = {
  id: string;
  agentSlug: string;
  agentName: string;
  walletAddress: string;
  publicKey: string;
  permissions?: {
    calls: { to?: string; signature?: string }[];
    spend: {
      limit: string;
      period: string;
      token?: string;
      label?: string;
    }[];
  };
  expiry: number;
  transactionHash?: string;
  status: "active" | "revoked" | "expired" | "demo";
  mode: "live" | "demo";
  network: "bnb-testnet" | "bnb";
  chainId: number;
  createdAt: string;
  revokedAt?: string;
  explorerUrl?: string;
  adminAddress?: string;
  keystore?: string;
  faucetTxHash?: string;
  /** server-only — stripped in API responses */
  sessionPrivateKey?: string;
  policyTitle?: string;
};

const memory = new Map<string, StoredAltanaSession>();

function dir() {
  return path.join(process.cwd(), "data", "altana-sessions");
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

export function publicSession(
  s: StoredAltanaSession,
): Omit<StoredAltanaSession, "sessionPrivateKey"> {
  const { sessionPrivateKey: _, ...rest } = s;
  return {
    ...rest,
    permissions: {
      calls: rest.permissions?.calls || [],
      spend: rest.permissions?.spend || [],
    },
  };
}

export async function saveSession(
  s: StoredAltanaSession,
): Promise<StoredAltanaSession> {
  memory.set(s.id, s);
  try {
    await ensure();
    await fs.writeFile(fileFor(s.id), JSON.stringify(s, null, 2), "utf8");
  } catch {
    /* memory only */
  }
  return s;
}

export async function getSession(
  id: string,
): Promise<StoredAltanaSession | null> {
  if (memory.has(id)) return memory.get(id)!;
  try {
    const raw = await fs.readFile(fileFor(id), "utf8");
    const s = JSON.parse(raw) as StoredAltanaSession;
    memory.set(s.id, s);
    return s;
  } catch {
    return null;
  }
}

export async function listSessions(
  limit = 40,
): Promise<Omit<StoredAltanaSession, "sessionPrivateKey">[]> {
  try {
    await ensure();
    const files = await fs.readdir(dir());
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(dir(), f), "utf8");
        const s = JSON.parse(raw) as StoredAltanaSession;
        // mark expired
        if (s.status === "active" && s.expiry * 1000 < Date.now()) {
          s.status = "expired";
        }
        memory.set(s.id, s);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* disk unavailable */
  }
  return [...memory.values()]
    .map((s) => {
      if (s.status === "active" && s.expiry * 1000 < Date.now()) {
        s.status = "expired";
      }
      return publicSession(s);
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

export function newSessionId() {
  return `alt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
