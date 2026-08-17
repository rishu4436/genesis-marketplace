/**
 * Public, commitable proof of a live Altana Keystore grant.
 * No private keys — tx hash + addresses only, for /judge and /altana.
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

function proofPath() {
  return path.join(process.cwd(), "config", "altana-proof.json");
}

export async function readLiveProof(): Promise<AltanaLiveProof | null> {
  try {
    const raw = await fs.readFile(proofPath(), "utf8");
    const p = JSON.parse(raw) as AltanaLiveProof;
    if (!p.walletAddress) return null;
    return p;
  } catch {
    return null;
  }
}

export async function writeLiveProof(p: AltanaLiveProof): Promise<void> {
  const dir = path.dirname(proofPath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(proofPath(), JSON.stringify(p, null, 2) + "\n", "utf8");
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
