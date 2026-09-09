import proofJson from "../../config/judge-proof.json";
import { bscscanTx, isTxHash } from "./erc8183-escrow";
import { kvCmd } from "./kv";
import { listJobs } from "./job-store";
import type { HireJob } from "./hire-engine";

const ESCROW_PROOF_KV = "genesis:judge-escrow-proof";

export type EscrowJudgeProof = {
  label: string;
  network: string;
  chainId: number;
  marketplaceJobId: string | null;
  onchainJobId: string | null;
  fundTx: string | null;
  submitTx: string | null;
  settleTx: string | null;
  disputeTx: string | null;
  note: string;
};

export function escrowJudgeProof(): EscrowJudgeProof {
  const raw = proofJson.escrow as EscrowJudgeProof;
  if (raw.fundTx && !isTxHash(raw.fundTx)) {
    return { ...raw, fundTx: null, submitTx: null, settleTx: null, disputeTx: null };
  }
  return {
    ...raw,
    submitTx: isTxHash(raw.submitTx) ? raw.submitTx : null,
  };
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

export type JudgeDemoEmbed =
  | { kind: "youtube" | "vimeo"; src: string }
  | { kind: "video"; src: string }
  | { kind: "link"; src: string };

export function judgeDemoEmbed(url: string): JudgeDemoEmbed {
  const yt = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
  );
  if (yt?.[1]) {
    return {
      kind: "youtube",
      src: `https://www.youtube-nocookie.com/embed/${yt[1]}`,
    };
  }
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm?.[1]) {
    return { kind: "vimeo", src: `https://player.vimeo.com/video/${vm[1]}` };
  }
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return { kind: "video", src: url };
  return { kind: "link", src: url };
}

function proofFromJob(job: HireJob, note: string): EscrowJudgeProof {
  return {
    label: "ERC-8183 escrow proof (separate from soft-hire jobs)",
    network: "bsc-mainnet",
    chainId: 56,
    marketplaceJobId: job.id,
    onchainJobId: job.escrow?.onchainJobId ?? null,
    fundTx: job.escrow?.fundTx ?? null,
    submitTx: job.escrow?.submitTx ?? null,
    settleTx: job.escrow?.settleTx ?? null,
    disputeTx: job.escrow?.disputeTx ?? null,
    note,
  };
}

/** Persist a verified mainnet fund so /judge can pin it. Never invent hashes. */
export async function pinEscrowJudgeProof(job: HireJob): Promise<void> {
  if (!isTxHash(job.escrow?.fundTx)) return;
  if (job.quote?.protocol === "ERC-8183-sim") return;
  const payload = proofFromJob(
    job,
    "Pinned from a verified in-app BSC mainnet fund. Soft-hire receipts are not this proof.",
  );
  await kvCmd("SET", ESCROW_PROOF_KV, JSON.stringify(payload));
}

/**
 * Config file wins when it has a real fundTx. Else KV pin, else a persisted
 * job with a real mainnet hash. Empty stays empty — do not invent.
 */
export async function resolveEscrowJudgeProof(): Promise<EscrowJudgeProof> {
  const file = escrowJudgeProof();
  if (isTxHash(file.fundTx)) return file;

  const raw = await kvCmd<string>("GET", ESCROW_PROOF_KV);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as EscrowJudgeProof;
      if (isTxHash(parsed.fundTx)) {
        return { ...file, ...parsed, fundTx: parsed.fundTx };
      }
    } catch {
      /* ignore */
    }
  }

  try {
    const jobs = await listJobs(80);
    const hit = jobs.find(
      (j) =>
        isTxHash(j.escrow?.fundTx) &&
        j.quote?.protocol === "ERC-8183" &&
        j.purpose !== "holdout",
    );
    if (hit && isTxHash(hit.escrow?.fundTx)) {
      return proofFromJob(
        hit,
        "Discovered from a persisted mainnet escrow receipt. Soft-hire jobs are not this proof.",
      );
    }
  } catch {
    /* store unavailable */
  }

  return file;
}
