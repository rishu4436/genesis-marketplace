/**
 * Phase 0 evidence checks — run with: npx --yes tsx scripts/verify-job-receipt.ts
 * Does not change seed job IDs or hackathon hire rules.
 */

import { SEED_JOBS } from "../src/lib/seed-jobs";
import {
  hashSpec,
  sealJob,
  specFromJob,
  verifyJobReceipt,
} from "../src/lib/job-receipt";
import type { HireJob } from "../src/lib/hire-engine";
import { CATEGORIES } from "../src/lib/categories";

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function main() {
  const seeds = SEED_JOBS.filter((j) => j.status === "delivered");
  check("seed delivered jobs exist", seeds.length >= 4, `${seeds.length} jobs`);

  const cats = new Set(seeds.map((j) => j.categoryId).filter(Boolean));
  check(
    "all four hackathon categories present in seeds",
    CATEGORIES.every((c) => cats.has(c.id)),
    [...cats].join(", "),
  );

  const ids = new Set<string>();
  for (const raw of seeds) {
    const originalId = raw.id;
    const originalTask = raw.task;
    const originalClaim = raw.claimCode;
    ids.add(originalId);

    const sealed = sealJob(clone(raw));
    check(
      `${originalId} id unchanged after seal`,
      sealed.id === originalId,
    );
    check(
      `${originalId} task unchanged after seal`,
      sealed.task === originalTask,
    );
    check(
      `${originalId} claim code unchanged`,
      sealed.claimCode === originalClaim,
    );
    check(
      `${originalId} mandate forbids custody and fund movement`,
      sealed.spec?.mandate.custody === false &&
        sealed.spec?.mandate.mayMoveFunds === false &&
        sealed.spec?.mandate.output === "structured-plan",
    );

    const v = verifyJobReceipt(sealed);
    check(`${originalId} verifies after seal`, v.ok, v.issues.join("; ") || "ok");
    check(
      `${originalId} spec hash is 64 hex`,
      /^[a-f0-9]{64}$/.test(v.specHash),
    );
    check(
      `${originalId} output hash is 64 hex`,
      Boolean(v.outputHash && /^[a-f0-9]{64}$/.test(v.outputHash)),
    );

    const again = sealJob(clone(raw));
    check(
      `${originalId} spec hash is stable`,
      hashSpec(specFromJob(sealed)) === hashSpec(specFromJob(again)),
    );

    const tamperedOut = sealJob(clone(raw));
    tamperedOut.deliverable = {
      ...tamperedOut.deliverable!,
      summary: tamperedOut.deliverable!.summary + " TAMPER",
    };
    const vt = verifyJobReceipt(tamperedOut);
    check(
      `${originalId} output tamper is detected`,
      !vt.ok && vt.outputMatch === false,
    );

    const tamperedSpec = sealJob(clone(raw));
    tamperedSpec.task = tamperedSpec.task + " TAMPER";
    const vs = verifyJobReceipt(tamperedSpec);
    check(
      `${originalId} spec tamper is detected`,
      !vs.ok && vs.specMatch === false,
    );
  }

  const a = seeds[0];
  const b = clone(a) as HireJob;
  b.id = "job_other_id";
  check(
    "same brief + seller → same spec hash across job ids",
    hashSpec(specFromJob(a)) === hashSpec(specFromJob(b)),
  );

  const whitespace = clone(a) as HireJob;
  whitespace.task = `  ${a.task.replace(/ /g, "   ")}  `;
  check(
    "task whitespace is canonicalized",
    hashSpec(specFromJob(a)) === hashSpec(specFromJob(whitespace)),
  );

  const noSeal = clone(a);
  delete noSeal.spec;
  delete noSeal.receipt;
  const vBare = verifyJobReceipt(noSeal);
  check("unsealed job fails verify (no receipt)", vBare.ok === false);

  const failed = checks.filter((c) => !c.ok);
  console.log("");
  console.log(`Result  ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    console.error("Failed:");
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main();
