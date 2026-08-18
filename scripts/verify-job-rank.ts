/**
 * Phase 5 eligibility-gated rank checks.
 * Run: npx --yes tsx scripts/verify-job-rank.ts
 */

import { allGenesisAgents } from "../src/lib/genesis-agents";
import { JOB_CHIPS } from "../src/lib/job-chips";
import {
  JOB_AXIS_WEIGHT,
  rankGenesisForJob,
  specialistEligibility,
} from "../src/lib/job-rank";
import { admitSeller } from "../src/lib/admission";
import { matchAgentsForJob } from "../src/lib/intent-match";
import { CATEGORIES } from "../src/lib/categories";
import { sealJob, verifyJobReceipt } from "../src/lib/job-receipt";
import { SEED_JOBS } from "../src/lib/seed-jobs";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  const agents = allGenesisAgents();
  check("four specialists stay in the catalog", agents.length === 4);

  for (const chip of JOB_CHIPS) {
    const ranked = rankGenesisForJob(chip.task);
    const organicSlugs = ranked.organic.map((r) => r.slug);
    const specialist = agents.find((a) => a.categoryId === chip.categoryId)!;
    check(
      `${chip.id} organic includes the category specialist`,
      organicSlugs.includes(specialist.slug),
      organicSlugs.join(","),
    );
    check(
      `${chip.id} does not rank the wrong job type as organic`,
      ranked.organic.every((r) => r.categoryId === chip.categoryId),
      ranked.organic.map((r) => r.slug).join(","),
    );
    check(
      `${chip.id} excluded are still hireable`,
      ranked.excluded.every((r) => r.hireable === true),
    );
    check(
      `${chip.id} excluded have no organic rank`,
      ranked.excluded.every((r) => r.organicRank == null),
    );
    check(`${chip.id} paid rank is off`, ranked.paidRank === false);
    check(
      `${chip.id} #1 is the specialist`,
      ranked.organic[0]?.slug === specialist.slug,
      ranked.organic[0]?.slug,
    );
    check(
      `${chip.id} why explains eligibility`,
      (ranked.organic[0]?.why.length || 0) > 0,
    );
  }

  const hf = rankGenesisForJob(JOB_CHIPS.find((c) => c.id === "hf-protect")!.task);
  check(
    "health-factor rank is safety-weighted in why",
    hf.organic[0]?.why.some((w) => /safety/i.test(w) || /Receipt/.test(w)),
    hf.organic[0]?.why.join(" | "),
  );

  check(
    "health-factor axis weights safety highest",
    JOB_AXIS_WEIGHT["health-factor"].safety >
      JOB_AXIS_WEIGHT["health-factor"].correctness,
  );

  const match = matchAgentsForJob(
    "Rebalance my PCS V3 LP when out of range",
    3,
  );
  check("match matches are all eligible", match.matches.every((m) => m.eligible !== false));
  check(
    "match does not return grid as a rebalance organic hit",
    match.matches.every((m) => m.agent.categoryId === "rebalancing"),
  );
  check("match paidRank false", match.paidRank === false);

  const rk = agents.find((a) => a.slug === "range-keeper")!;
  const eligOk = specialistEligibility(rk, "rebalancing");
  check("RK eligible for rebalance", eligOk.eligible === true);
  const eligWrong = specialistEligibility(rk, "health-factor");
  check("RK not organic for health-factor", eligWrong.eligible === false);
  check("RK still hireable for health-factor", eligWrong.hireable === true);

  const clones = rankGenesisForJob(JOB_CHIPS[0].task);
  const controllers = clones.organic.map((r) => r.controller).filter(Boolean);
  check(
    "clone penalty keeps unique controllers",
    new Set(controllers).size === controllers.length,
  );

  for (const cat of CATEGORIES) {
    check(
      `hire catalog still has ${cat.id}`,
      agents.some((a) => a.categoryId === cat.id),
    );
  }

  const adm = admitSeller(rk);
  check("admission still admitted (rank does not delist)", adm.grade === "admitted");

  for (const raw of SEED_JOBS.filter((j) => j.status === "delivered").slice(0, 4)) {
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
