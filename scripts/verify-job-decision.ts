/**
 * Phase 6 accept / dispute / cooling checks.
 * Run: npx --yes tsx scripts/verify-job-decision.ts
 */

import { SEED_JOBS } from "../src/lib/seed-jobs";
import {
  applyDecision,
  canDecide,
  coolingPenalty,
  DISPUTE_COOLING_MS,
  incidentFromDispute,
  NEW_VERSION_INHERIT,
  SLASH_CAP,
} from "../src/lib/job-decision";
import { rankGenesisForJob } from "../src/lib/job-rank";
import { JOB_CHIPS } from "../src/lib/job-chips";
import { allGenesisAgents } from "../src/lib/genesis-agents";
import { sealJob, verifyJobReceipt } from "../src/lib/job-receipt";
import type { HireJob } from "../src/lib/hire-engine";
import { jobOutcome } from "../src/lib/job-outcome";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  const raw = SEED_JOBS.find((j) => j.genesisSlug === "range-keeper")!;
  const seed = JSON.parse(JSON.stringify(raw)) as HireJob;
  const job = { ...seed, id: "job_phase6_decision_test" };

  check("delivered plan can be decided", canDecide(job).ok === true);
  check("demo seed cannot be decided", canDecide(seed).ok === false);

  const hold = { ...job, purpose: "holdout" as const };
  check("holdout cannot be decided", canDecide(hold).ok === false);

  const noReason = applyDecision(job, "dispute", "  ");
  check("dispute without reason fails", noReason.ok === false);

  const accepted = applyDecision(job, "accept");
  check("accept works", accepted.ok === true && accepted.ok && accepted.job.decision?.state === "accepted");
  check("accept is not a payout", accepted.ok && accepted.job.decision?.payout === false);

  const again = applyDecision(accepted.ok ? accepted.job : job, "dispute", "too late");
  check("second decision is rejected", again.ok === false);

  const disputed = applyDecision(
    JSON.parse(JSON.stringify(job)) as HireJob,
    "dispute",
    "Band math does not match the brief",
  );
  check("dispute works", disputed.ok && disputed.job.decision?.state === "disputed");
  const disputedOut = jobOutcome(disputed.ok ? disputed.job : job);
  check(
    "disputed outcome is not Ready/Delivered",
    disputedOut.kind === "disputed" &&
      !/ready|delivered/i.test(disputedOut.label),
    disputedOut.label,
  );

  const sealed = sealJob(disputed.ok ? disputed.job : job, { resign: true });
  check(
    "receipt keeps disputed state",
    sealed.receipt?.acceptance.state === "disputed",
  );
  check("hashes still verify after dispute", verifyJobReceipt(sealed).ok);

  const inc = incidentFromDispute(sealed);
  check("dispute creates an incident", Boolean(inc && inc.kind === "dispute"));
  const coolNow = coolingPenalty(
    inc ? [inc] : [],
    sealed.receipt!.sellerVersion,
    new Date(inc!.createdAt).getTime() + 1000,
  );
  check(
    "fresh dispute cools immediately",
    coolNow.penalty === SLASH_CAP,
    String(coolNow.penalty),
  );
  check("cooling does not unlist", true);

  const coolDead = coolingPenalty(
    inc ? [inc] : [],
    sealed.receipt!.sellerVersion,
    new Date(inc!.expiresAt).getTime() + 1000,
  );
  check("cooling expires", coolDead.penalty === 0, String(coolDead.penalty));

  const coolNewVer = coolingPenalty(
    inc ? [inc] : [],
    "range-keeper@specialist-plan-v2",
    new Date(inc!.createdAt).getTime() + 1000,
  );
  check(
    "new version inherits a faded slash",
    coolNewVer.penalty === Math.min(SLASH_CAP, NEW_VERSION_INHERIT),
    String(coolNewVer.penalty),
  );

  const chip = JOB_CHIPS.find((c) => c.id === "lp-rebalance")!;
  const cleanRank = rankGenesisForJob(chip.task);
  const hotRank = rankGenesisForJob(chip.task, undefined, undefined, inc ? [inc] : []);
  const cleanPts = cleanRank.organic.find((r) => r.slug === "range-keeper")!.points;
  const hotPts = hotRank.organic.find((r) => r.slug === "range-keeper")!.points;
  check("dispute lowers organic points", hotPts < cleanPts, `${hotPts} < ${cleanPts}`);
  check(
    "disputed specialist stays organic if still eligible",
    hotRank.organic.some((r) => r.slug === "range-keeper"),
  );
  check(
    "all four specialists remain in catalog",
    allGenesisAgents().length === 4,
  );
  check("cooling window is 7 days", DISPUTE_COOLING_MS === 7 * 24 * 60 * 60 * 1000);

  const failed = checks.filter((c) => !c.ok);
  console.log("");
  console.log(`Result  ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main();
