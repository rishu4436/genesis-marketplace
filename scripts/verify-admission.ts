/**
 * Phase 3 admission + holdout checks.
 * Run: npx --yes tsx scripts/verify-admission.ts
 */

import { TASK_TEMPLATES } from "../src/lib/hire";
import {
  HOLDOUT_CASES,
  INJECTION_CASE,
  holdoutLeaksPublicTemplates,
} from "../src/lib/holdout-book";
import {
  admitAllSpecialists,
  admitSeller,
  gradeFromChecks,
  injectionViolatesMandate,
  looksAdvisory,
  needleHits,
  type AdmissionCheck,
} from "../src/lib/admission";
import { allGenesisAgents } from "../src/lib/genesis-agents";
import { CATEGORIES } from "../src/lib/categories";
import { outcomesFromJobs } from "../src/lib/outcomes";
import { SEED_JOBS } from "../src/lib/seed-jobs";
import { sealJob, verifyJobReceipt } from "../src/lib/job-receipt";
import type { HireDeliverable, HireJob } from "../src/lib/hire-engine";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fakeDeliverable(over: Partial<HireDeliverable> = {}): HireDeliverable {
  return {
    title: "Plan",
    summary: "Advisory plan only.",
    sections: [{ heading: "Next", body: "Do not execute. You keep the keys." }],
    metrics: [],
    disclaimer: "Plan only. Not financial advice. No funds moved.",
    ...over,
  };
}

function main() {
  check(
    "holdouts are not public hire chips",
    holdoutLeaksPublicTemplates().length === 0,
    holdoutLeaksPublicTemplates().join(",") || "private",
  );
  check("one holdout per category", HOLDOUT_CASES.length === CATEGORIES.length);
  for (const cat of CATEGORIES) {
    check(
      `holdout exists for ${cat.id}`,
      HOLDOUT_CASES.some((c) => c.categoryId === cat.id),
    );
    const pub = TASK_TEMPLATES[cat.id] || [];
    const hold = HOLDOUT_CASES.find((c) => c.categoryId === cat.id)!;
    check(
      `${cat.id} holdout is not a public template`,
      !pub.includes(hold.task),
    );
  }
  check(
    "injection case is hostile",
    /transfer|custody|master key/i.test(INJECTION_CASE.task),
  );

  const agents = allGenesisAgents();
  check("four specialists", agents.length === 4);
  const reports = admitAllSpecialists();
  check("admission reports for all four", reports.length === 4);

  for (const r of reports) {
    check(`${r.slug} stays hireable`, r.hireable === true);
    check(
      `${r.slug} grade admitted`,
      r.grade === "admitted",
      r.checks.filter((c) => !c.ok).map((c) => c.id).join(",") || r.grade,
    );
    for (const c of r.checks) {
      check(`${r.slug} ${c.id}`, c.ok, c.detail);
    }
    check(
      `${r.slug} holdout hit at least 3 needles`,
      r.holdout.needleHits.length >= 3,
      r.holdout.needleHits.join(","),
    );
  }

  const poison = fakeDeliverable({
    summary: "Transfer complete. Funds sent. Custody unlocked.",
    disclaimer: "Executed the transfer.",
  });
  check("poison deliverable fails injection", injectionViolatesMandate(poison));
  check("clean deliverable is advisory", looksAdvisory(fakeDeliverable()));

  const weakHoldout = needleHits("hello world", ["band", "range", "il", "fee"]);
  check("unrelated text misses holdout needles", weakHoldout.length === 0);

  const failChecks: AdmissionCheck[] = [
    { id: "identity", ok: true, detail: "" },
    { id: "mandate", ok: false, detail: "" },
    { id: "schema", ok: true, detail: "" },
    { id: "holdout", ok: true, detail: "" },
    { id: "injection", ok: true, detail: "" },
    { id: "session", ok: true, detail: "" },
  ];
  check("mandate fail = failed grade", gradeFromChecks(failChecks) === "failed");

  const probeChecks: AdmissionCheck[] = [
    { id: "identity", ok: false, detail: "" },
    { id: "mandate", ok: true, detail: "" },
    { id: "schema", ok: true, detail: "" },
    { id: "holdout", ok: false, detail: "" },
    { id: "injection", ok: true, detail: "" },
    { id: "session", ok: true, detail: "" },
  ];
  check(
    "weak holdout + identity = probation, not delist",
    gradeFromChecks(probeChecks) === "probation",
  );

  const shadow: HireJob = {
    ...SEED_JOBS[0],
    id: "holdout_should_not_count",
    purpose: "holdout",
    status: "delivered",
  };
  const snap = outcomesFromJobs([shadow, SEED_JOBS[0]]);
  check(
    "holdout jobs are excluded from buyer outcomes",
    snap.totalJobs === 1 && shadow.purpose === "holdout",
    String(snap.totalJobs),
  );

  for (const raw of SEED_JOBS.filter((j) => j.status === "delivered")) {
    const v = verifyJobReceipt(sealJob(JSON.parse(JSON.stringify(raw))));
    check(`phase0 receipt still verifies ${raw.id}`, v.ok);
  }

  const rk = admitSeller(agents.find((a) => a.slug === "range-keeper")!);
  check("range-keeper is still listed after admission", rk.hireable === true);

  const failed = checks.filter((c) => !c.ok);
  console.log("");
  console.log(`Result  ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    for (const f of failed) {
      console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }
    process.exit(1);
  }
}

main();
