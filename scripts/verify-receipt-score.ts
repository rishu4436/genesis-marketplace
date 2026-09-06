/**
 * Phase 4 receipt-score checks.
 * Run: npx --yes tsx scripts/verify-receipt-score.ts
 */

import { SEED_JOBS } from "../src/lib/seed-jobs";
import {
  jobsForSeller,
  scoreSellerFromJobs,
  shrinkRate,
  versionWeight,
  SCORE_PRIOR_N,
} from "../src/lib/receipt-score";
import { allGenesisAgents } from "../src/lib/genesis-agents";
import { sealJob, verifyJobReceipt } from "../src/lib/job-receipt";
import { CATEGORIES } from "../src/lib/categories";
import type { HireJob } from "../src/lib/hire-engine";
import { rankScore } from "../src/lib/agent-rank";
import { genesisToAgentCard } from "../src/lib/genesis-agents";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  check(
    "3/3 successes are not 100 (shrinkage)",
    shrinkRate(3, 3) < 90 && shrinkRate(3, 3) > 50,
    String(shrinkRate(3, 3)),
  );
  check("0/0 stays near prior, not zero", shrinkRate(0, 0) === 55, String(shrinkRate(0, 0)));
  check("prior N is 4", SCORE_PRIOR_N === 4);

  const agents = allGenesisAgents();
  check("four specialists", agents.length === 4);
  check(
    "one per category",
    CATEGORIES.every((c) => agents.some((a) => a.categoryId === c.id)),
  );

  const jobs = SEED_JOBS.map((j) => sealJob(JSON.parse(JSON.stringify(j)) as HireJob));
  const holdout: HireJob = {
    ...jobs[0],
    id: "holdout_must_ignore",
    purpose: "holdout",
    genesisSlug: "range-keeper",
    status: "delivered",
  };
  const mixed = [...jobs, holdout];
  check(
    "holdouts excluded from seller sample",
    jobsForSeller(mixed, "range-keeper").every((j) => j.purpose !== "holdout"),
  );

  for (const agent of agents) {
    const card = scoreSellerFromJobs(agent, mixed);
    check(`${agent.slug} hireable`, card.hireable === true);
    check(`${agent.slug} has 5 axes`, card.axes.length === 5);
    check(
      `${agent.slug} economic quality absent`,
      card.absent.some((a) => a.startsWith("economic")),
    );
    check(
      `${agent.slug} composite is not a star rating`,
      card.composite > 0 && card.composite <= 100,
      String(card.composite),
    );
    check(
      `${agent.slug} sample ignores holdout`,
      card.sampleSize === jobsForSeller(jobs, agent.slug).filter((j) =>
        ["delivered", "failed"].includes(j.status),
      ).length,
      String(card.sampleSize),
    );
    const ids = card.axes.map((a) => a.id).join(",");
    check(
      `${agent.slug} axes are receipt dimensions`,
      ids === "reliability,correctness,safety,honesty,freshness",
      ids,
    );
  }

  const rk = agents.find((a) => a.slug === "range-keeper")!;
  const clean = jobs.filter((j) => j.genesisSlug === "range-keeper");
  const dirty = clean.map((j) => {
    const copy = JSON.parse(JSON.stringify(j)) as HireJob;
    if (copy.deliverable) {
      copy.deliverable = {
        ...copy.deliverable,
        summary: copy.deliverable.summary + " TAMPER",
      };
    }
    return copy;
  });
  check(
    "tampered receipts fail verify",
    dirty.some((j) => j.receipt && verifyJobReceipt(j).ok === false),
  );
  const honest = scoreSellerFromJobs(rk, clean);
  const lie = scoreSellerFromJobs(rk, dirty);
  const honClean = honest.axes.find((a) => a.id === "honesty")!.value;
  const honDirty = lie.axes.find((a) => a.id === "honesty")!.value;
  check(
    "tamper lowers honesty",
    honDirty < honClean,
    `${honDirty} < ${honClean}`,
  );

  const faded = versionWeight(
    { ...clean[0], receipt: { ...clean[0].receipt!, sellerVersion: "old@v0" } },
    "range-keeper@specialist-plan-v1",
  );
  check("old version is faded, not equal", faded === 0.25);

  const composites = agents.map((a) => scoreSellerFromJobs(a, jobs).composite);
  const unique = new Set(composites.map((c) => c.toFixed(1)));
  check(
    "specialist composites are not a shared stamp",
    unique.size === agents.length,
    composites.join(", "),
  );

  const card = genesisToAgentCard(rk);
  const catalog = rankScore(card);
  const receipt = scoreSellerFromJobs(rk, jobs).composite;
  check(
    "catalog rankScore still exists and is a different function",
    Number.isFinite(catalog) && catalog !== receipt,
  );

  for (const raw of SEED_JOBS.filter((j) => j.status === "delivered")) {
    check(
      `phase0 still verifies ${raw.id}`,
      verifyJobReceipt(sealJob(JSON.parse(JSON.stringify(raw)))).ok,
    );
  }

  const failed = checks.filter((c) => !c.ok);
  console.log("");
  console.log(`Result  ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main();
