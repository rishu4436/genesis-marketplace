/**
 * Durable job store for shareable results.
 * In-memory + optional disk under data/jobs (local/dev).
 * Client also keeps localStorage mirror.
 */

import { promises as fs } from "fs";
import path from "path";
import type { HireJob } from "./hire-engine";
import { SEED_JOBS } from "./seed-jobs";

const memory = new Map<string, HireJob>();
let seedsLoaded = false;

function ensureSeeds() {
  if (seedsLoaded) return;
  seedsLoaded = true;
  for (const j of SEED_JOBS) {
    if (!memory.has(j.id)) memory.set(j.id, j);
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

export async function saveJob(job: HireJob): Promise<HireJob> {
  ensureSeeds();
  memory.set(job.id, job);
  try {
    await ensureDir();
    await fs.writeFile(filePath(job.id), JSON.stringify(job, null, 2), "utf8");
  } catch {
    /* memory still holds it */
  }
  return job;
}

export async function getJob(id: string): Promise<HireJob | null> {
  ensureSeeds();
  if (memory.has(id)) return memory.get(id)!;
  try {
    const raw = await fs.readFile(filePath(id), "utf8");
    const job = JSON.parse(raw) as HireJob;
    memory.set(job.id, job);
    return job;
  } catch {
    // Seed fallback by id
    const seed = SEED_JOBS.find((j) => j.id === id);
    return seed || null;
  }
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
