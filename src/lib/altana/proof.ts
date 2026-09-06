/**
 * Public, commitable proof of a live Altana Keystore grant.
 * No private keys — tx hash + addresses only, for /judge and /altana.
 * File is the git fallback; KV keeps a Vercel grant after the lambda disk dies.
 */

import { promises as fs } from "fs";
import path from "path";

export type AltanaLiveProof = {
  network: "bnb-testnet" | "bnb";
  chainId: number;
  walletAddress: string;
  adminAddress: string;
  keystore: string;
  transactionHash?: string;
  faucetTxHash?: string;
  explorerUrl: string;
  keystoreExplorer: string;
  agentSlug: string;
  agentName: string;
  grantedAt: string;
  sessionId: string;
};

const PROOF_KV_KEY = "genesis:altana:proof";

function proofPath() {
  return path.join(process.cwd(), "config", "altana-proof.json");
}

function kvUrl() {
  return (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    ""
  );
}

function kvToken() {
  return (
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    ""
  );
}

async function kvGet(key: string): Promise<string | null> {
  const url = kvUrl();
  const token = kvToken();
  if (!url || !token) return null;
  try {
    const res = await fetch(url.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", key]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string | null };
    return json.result ?? null;
  } catch {
    return null;
  }
}

async function kvSet(key: string, value: string): Promise<void> {
  const url = kvUrl();
  const token = kvToken();
  if (!url || !token) return;
  try {
    await fetch(url.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", key, value]),
      cache: "no-store",
    });
  } catch {
    /* disk / git still holds a copy */
  }
}

function parseProof(raw: string): AltanaLiveProof | null {
  try {
    const p = JSON.parse(raw) as AltanaLiveProof;
    if (!p.walletAddress) return null;
    return p;
  } catch {
    return null;
  }
}

function betterProof(
  a: AltanaLiveProof | null,
  b: AltanaLiveProof | null,
): AltanaLiveProof | null {
  if (!a) return b;
  if (!b) return a;
  const aMain = a.chainId === 56 ? 1 : 0;
  const bMain = b.chainId === 56 ? 1 : 0;
  if (aMain !== bMain) return aMain > bMain ? a : b;
  const at = Date.parse(a.grantedAt || "") || 0;
  const bt = Date.parse(b.grantedAt || "") || 0;
  return at >= bt ? a : b;
}

export async function readLiveProof(): Promise<AltanaLiveProof | null> {
  let file: AltanaLiveProof | null = null;
  try {
    file = parseProof(await fs.readFile(proofPath(), "utf8"));
  } catch {
    file = null;
  }
  const kvRaw = await kvGet(PROOF_KV_KEY);
  const kv = kvRaw ? parseProof(kvRaw) : null;
  return betterProof(kv, file);
}

export async function writeLiveProof(p: AltanaLiveProof): Promise<void> {
  const body = JSON.stringify(p, null, 2) + "\n";
  try {
    const dir = path.dirname(proofPath());
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(proofPath(), body, "utf8");
  } catch {
    /* Vercel disk is ephemeral — KV is the production copy */
  }
  await kvSet(PROOF_KV_KEY, body);
}

export function readLiveProofSync(): AltanaLiveProof | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fsSync = require("fs") as typeof import("fs");
    const raw = fsSync.readFileSync(proofPath(), "utf8");
    const p = JSON.parse(raw) as AltanaLiveProof;
    if (!p.walletAddress) return null;
    return p;
  } catch {
    return null;
  }
}
