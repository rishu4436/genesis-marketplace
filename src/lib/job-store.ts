/**
 * Job store for shareable receipts.
 * Memory + disk (dev) + optional Upstash/Vercel KV (prod).
 * Buyer recovers a hire by job URL or claim code — not by device.
 */

import { promises as fs } from "fs";
import path from "path";
import type { HireJob } from "./hire-engine";
import { normalizeClaimCode } from "./hire-engine";
import { SEED_JOBS } from "./seed-jobs";

const memory = new Map<string, HireJob>();
const claims = new Map<string, string>();
let seedsLoaded = false;

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

export async function saveJob(job: HireJob): Promise<HireJob> {
  ensureSeeds();
  memory.set(job.id, job);
  indexClaim(job);
  try {
    await ensureDir();
    await fs.writeFile(filePath(job.id), JSON.stringify(job, null, 2), "utf8");
  } catch {
    /* memory still holds it */
  }
  if (kvEnabled()) {
    await kvCmd("SET", `genesis:job:${job.id}`, JSON.stringify(job));
    if (job.claimCode) {
      await kvCmd(
        "SET",
        `genesis:claim:${normalizeClaimCode(job.claimCode)}`,
        job.id,
      );
    }
  }
  return job;
}

export async function getJob(id: string): Promise<HireJob | null> {
  ensureSeeds();
  const want = decodeURIComponent(id);
  if (memory.has(want)) return memory.get(want)!;
  try {
    const raw = await fs.readFile(filePath(want), "utf8");
    const job = JSON.parse(raw) as HireJob;
    memory.set(job.id, job);
    indexClaim(job);
    return job;
  } catch {
    /* try kv */
  }
  const fromKv = await kvCmd<string>("GET", `genesis:job:${want}`);
  if (fromKv) {
    try {
      const job = JSON.parse(fromKv) as HireJob;
      memory.set(job.id, job);
      indexClaim(job);
      return job;
    } catch {
      /* ignore */
    }
  }
  const seed = SEED_JOBS.find((j) => j.id === want);
  return seed || null;
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
  return [...memory.values()]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}
