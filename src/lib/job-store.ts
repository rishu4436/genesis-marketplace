/**
 * Job store for shareable receipts.
 * Memory + disk (dev) + optional Upstash/Vercel KV (prod).
 * Buyer recovers a hire by job URL or claim code — not by device.
 * Decision state lives on the job; reseal must not invent a new hire.
 */

import { promises as fs } from "fs";
import path from "path";
import type { HireJob } from "./hire-engine";
import { normalizeClaimCode } from "./hire-engine";
import { SEED_JOBS } from "./seed-jobs";
import { sealJob } from "./job-receipt";
import { PROOF_JOB_IDS } from "./proof-jobs";

const JOBS_INDEX_KEY = "genesis:jobs:ids";

const memory = new Map<string, HireJob>();
const claims = new Map<string, string>();
const walletJobs = new Map<string, string[]>();
let seedsLoaded = false;

function normWallet(addr: string) {
  return addr.trim().toLowerCase();
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

function kvEnabled() {
  return Boolean(kvUrl() && kvToken());
}

async function kvCmd<T = unknown>(
  ...cmd: (string | number)[]
): Promise<T | null> {
  if (!kvEnabled()) return null;
  try {
    const res = await fetch(`${kvUrl()!.replace(/\/$/, "")}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kvToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: T };
    return json.result ?? null;
  } catch {
    return null;
  }
}

function ensureSeeds() {
  if (seedsLoaded) return;
  seedsLoaded = true;
  for (const j of SEED_JOBS) {
    if (!memory.has(j.id)) memory.set(j.id, j);
    if (j.claimCode) claims.set(normalizeClaimCode(j.claimCode), j.id);
  }
}

function jobsDir() {
  return path.join(process.cwd(), "data", "jobs");
}

async function ensureDir() {
  try {
    await fs.mkdir(jobsDir(), { recursive: true });
  } catch {
    /* ignore */
  }
}

function filePath(id: string) {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(jobsDir(), `${safe}.json`);
}

function indexClaim(job: HireJob) {
  if (job.claimCode) {
    claims.set(normalizeClaimCode(job.claimCode), job.id);
  }
}

function walletJobsDir() {
  return path.join(process.cwd(), "data", "wallet-jobs");
}

function walletJobsFile(addr: string) {
  const safe = normWallet(addr).replace(/[^a-z0-9]/g, "_");
  return path.join(walletJobsDir(), `${safe}.json`);
}

export async function indexWalletJob(addr: string, jobId: string) {
  const key = normWallet(addr);
  if (!key || !jobId) return;
  const prev = walletJobs.get(key) || [];
  const next = [jobId, ...prev.filter((id) => id !== jobId)].slice(0, 80);
  walletJobs.set(key, next);
  try {
    await fs.mkdir(walletJobsDir(), { recursive: true });
    await fs.writeFile(walletJobsFile(key), JSON.stringify(next), "utf8");
  } catch {
    /* memory still holds */
  }
  if (kvEnabled()) {
    await kvCmd("SET", `genesis:wjobs:${key}`, JSON.stringify(next));
  }
}

export async function jobsForWallet(addr: string): Promise<HireJob[]> {
  const key = normWallet(addr);
  if (!key) return [];
  const ids = new Set<string>();
  for (const id of walletJobs.get(key) || []) ids.add(id);
  try {
    const raw = await fs.readFile(walletJobsFile(key), "utf8");
    const arr = JSON.parse(raw) as string[];
    if (Array.isArray(arr)) for (const id of arr) ids.add(id);
  } catch {
    /* no disk index */
  }
  const fromKv = await kvCmd<string>("GET", `genesis:wjobs:${key}`);
  if (fromKv) {
    try {
      const arr = JSON.parse(fromKv) as string[];
      if (Array.isArray(arr)) for (const id of arr) ids.add(id);
    } catch {
      /* ignore */
    }
  }
  for (const job of memory.values()) {
    if (
      job.payment?.walletAddress &&
      normWallet(job.payment.walletAddress) === key
    ) {
      ids.add(job.id);
    }
  }
  const out: HireJob[] = [];
  for (const id of ids) {
    const job = await getJob(id);
    if (job) out.push(job);
  }
  return out;
}

/** Legacy jobs (seeds) get a live seal in memory. Already-sealed jobs stay put. */
function hydrateEvidence(job: HireJob): HireJob {
  return sealJob(job);
}

export async function saveJob(job: HireJob): Promise<HireJob> {
  ensureSeeds();
  const sealed = sealJob(job, { resign: true });
  memory.set(sealed.id, sealed);
  indexClaim(sealed);
  try {
    await ensureDir();
    await fs.writeFile(filePath(sealed.id), JSON.stringify(sealed, null, 2), "utf8");
  } catch {
    /* memory still holds it */
  }
  if (kvEnabled()) {
    await kvCmd("SET", `genesis:job:${sealed.id}`, JSON.stringify(sealed));
    if (sealed.claimCode) {
      await kvCmd(
        "SET",
        `genesis:claim:${normalizeClaimCode(sealed.claimCode)}`,
        sealed.id,
      );
    }
    await indexJobId(sealed.id);
  }
  if (sealed.payment?.walletAddress) {
    await indexWalletJob(sealed.payment.walletAddress, sealed.id);
  }
  return sealed;
}

async function readKvJob(id: string): Promise<HireJob | null> {
  const fromKv = await kvCmd<string>("GET", `genesis:job:${id}`);
  if (!fromKv) return null;
  try {
    const job = JSON.parse(fromKv) as HireJob;
    if (!job?.id) return null;
    memory.set(job.id, job);
    indexClaim(job);
    return job;
  } catch {
    return null;
  }
}

export async function getJob(id: string): Promise<HireJob | null> {
  ensureSeeds();
  const want = decodeURIComponent(id);
  // KV is the production source of truth. In-memory hits on a warm
  // serverless instance must not hide a later accept/dispute write.
  if (kvEnabled()) {
    const kvJob = await readKvJob(want);
    if (kvJob) return hydrateEvidence(kvJob);
  }
  if (memory.has(want)) return hydrateEvidence(memory.get(want)!);
  try {
    const raw = await fs.readFile(filePath(want), "utf8");
    const job = JSON.parse(raw) as HireJob;
    memory.set(job.id, job);
    indexClaim(job);
    return hydrateEvidence(job);
  } catch {
    /* try kv if we skipped it (local) */
  }
  if (!kvEnabled()) {
    const kvJob = await readKvJob(want);
    if (kvJob) return hydrateEvidence(kvJob);
  }
  const seed = SEED_JOBS.find((j) => j.id === want);
  return seed ? hydrateEvidence(seed) : null;
}

export async function getJobByClaim(raw: string): Promise<HireJob | null> {
  ensureSeeds();
  const code = normalizeClaimCode(raw);
  if (!code) return null;
  const localId = claims.get(code);
  if (localId) return getJob(localId);
  const kvId = await kvCmd<string>("GET", `genesis:claim:${code}`);
  if (kvId) return getJob(kvId);
  return null;
}

/** Job URL, job id, or GX-XXX-XXX claim code */
export async function findJobReceipt(raw: string): Promise<HireJob | null> {
  const q = raw.trim();
  if (!q) return null;
  const fromUrl = q.match(/\/jobs\/([^/?#]+)/i);
  if (fromUrl?.[1]) {
    const found = await getJob(decodeURIComponent(fromUrl[1]));
    if (found) return found;
  }
  if (/^job[_-]/i.test(q) || q.startsWith("job_")) {
    const found = await getJob(q);
    if (found) return found;
  }
  return getJobByClaim(q);
}

async function indexJobId(id: string) {
  if (!id) return;
  const raw = await kvCmd<string>("GET", JOBS_INDEX_KEY);
  let ids: string[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) ids = parsed.map(String);
    } catch {
      ids = [];
    }
  }
  const next = [id, ...ids.filter((x) => x !== id)].slice(0, 500);
  await kvCmd("SET", JOBS_INDEX_KEY, JSON.stringify(next));
}

export async function listJobs(limit = 50): Promise<HireJob[]> {
  ensureSeeds();
  try {
    await ensureDir();
    const files = await fs.readdir(jobsDir());
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const id = f.replace(/\.json$/, "");
      if (!memory.has(id)) {
        try {
          const raw = await fs.readFile(path.join(jobsDir(), f), "utf8");
          const job = JSON.parse(raw) as HireJob;
          memory.set(job.id, job);
          indexClaim(job);
        } catch {
          /* skip */
        }
      }
    }
  } catch {
    /* disk unavailable */
  }

  const extraIds = new Set<string>(PROOF_JOB_IDS);
  const fromKv = await kvCmd<string>("GET", JOBS_INDEX_KEY);
  if (fromKv) {
    try {
      const parsed = JSON.parse(fromKv) as unknown;
      if (Array.isArray(parsed)) {
        for (const id of parsed) extraIds.add(String(id));
      }
    } catch {
      /* ignore */
    }
  }
  await Promise.all([...extraIds].map((id) => getJob(id)));

  return [...memory.values()]
    .map(hydrateEvidence)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}
