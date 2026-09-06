import proofJson from "../../config/judge-proof.json";
import { bscscanTx, isTxHash } from "./erc8183-escrow";

export type EscrowJudgeProof = {
  label: string;
  network: string;
  chainId: number;
  marketplaceJobId: string | null;
  onchainJobId: string | null;
  fundTx: string | null;
  settleTx: string | null;
  disputeTx: string | null;
  note: string;
};

export function escrowJudgeProof(): EscrowJudgeProof {
  const raw = proofJson.escrow as EscrowJudgeProof;
  if (raw.fundTx && !isTxHash(raw.fundTx)) {
    return { ...raw, fundTx: null, settleTx: null, disputeTx: null };
  }
  return raw;
}

export function escrowProofExplorer(hash: string | null): string | null {
  if (!hash || !isTxHash(hash)) return null;
  return bscscanTx(hash);
}

/** Env wins so Vercel can pin a video without a code change. Never invent a URL. */
export function judgeDemoVideoUrl(): string | null {
  const fromEnv = (process.env.NEXT_PUBLIC_JUDGE_DEMO_URL || "").trim();
  if (fromEnv.startsWith("https://")) return fromEnv;
  const fromFile = String(
    (proofJson as { demoVideoUrl?: string | null }).demoVideoUrl || "",
  ).trim();
  if (fromFile.startsWith("https://")) return fromFile;
  return null;
}
