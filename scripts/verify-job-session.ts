/**
 * Phase 2 isolation + session checks.
 * Run: npx --yes tsx scripts/verify-job-session.ts
 */

import {
  grantPlanSession,
  closeSession,
  sessionIsSpendless,
  sessionPublicView,
  PLAN_HOST_ALLOWLIST,
} from "../src/lib/job-session";
import {
  assertIsolationAllows,
  createIsolation,
  isolatedFetch,
} from "../src/lib/job-isolation";
import { ESCROW_STANCE } from "../src/lib/escrow-stance";
import { SEED_JOBS } from "../src/lib/seed-jobs";
import { sealJob, verifyJobReceipt } from "../src/lib/job-receipt";
import { CATEGORIES } from "../src/lib/categories";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  check("escrow is not required", ESCROW_STANCE.required === false);
  check("escrow is available on mainnet", ESCROW_STANCE.available === true);
  check(
    "escrow reason is BscMainnet",
    ESCROW_STANCE.reason === "BscMainnet",
  );

  const session = grantPlanSession({
    jobId: "job_test_iso",
    chainId: 56,
    tokenId: "genesis:range-keeper",
    genesisSlug: "range-keeper",
    categoryId: "rebalancing",
  });

  check("session spend is zero", session.policy.spend === "0");
  check("session mayMoveFunds is false", session.policy.mayMoveFunds === false);
  check("session custody is false", session.policy.custody === false);
  check("session escrowRequired is false", session.policy.escrowRequired === false);
  check("sessionIsSpendless", sessionIsSpendless(session));
  check(
    "session has no private key field",
    !("sessionPrivateKey" in session) && !("privateKey" in session),
  );
  check(
    "coingecko is allowlisted",
    session.policy.hosts.includes("api.coingecko.com") &&
      PLAN_HOST_ALLOWLIST.includes("api.coingecko.com"),
  );
  check(
    "venues come from mandate",
    session.policy.venues.includes("pancakeswap-v3"),
  );

  const pub = sessionPublicView(session);
  check("public view has no secrets", !("sessionPrivateKey" in pub));
  check("public view escrow not required", pub.escrow.required === false);

  const ctx = createIsolation(session);
  const allow = assertIsolationAllows(ctx, "api.coingecko.com");
  check("allowlisted host passes", allow.ok === true);

  const deny = assertIsolationAllows(ctx, "evil.example");
  check("unknown host is denied", deny.ok === false);

  try {
    await isolatedFetch(ctx, "https://evil.example/steal");
    check("isolatedFetch throws on deny", false);
  } catch (e) {
    check(
      "isolatedFetch throws on deny",
      e instanceof Error && e.message.includes("not allowlisted"),
    );
  }
  check("deny kills the session envelope", ctx.killed === true);

  const tight = grantPlanSession({
    jobId: "job_test_calls",
    chainId: 56,
    tokenId: "genesis:range-keeper",
    genesisSlug: "range-keeper",
    categoryId: "rebalancing",
  });
  tight.policy.maxCalls = 1;
  const ctx2 = createIsolation(tight);
  const first = assertIsolationAllows(ctx2, "api.coingecko.com");
  ctx2.calls.push({
    at: new Date().toISOString(),
    host: "api.coingecko.com",
    ok: true,
  });
  const second = assertIsolationAllows(ctx2, "api.coingecko.com");
  check("first allowlisted call ok", first.ok === true);
  check("call box blocks the next call", second.ok === false);

  const spendy = grantPlanSession({
    jobId: "job_test_spend",
    chainId: 56,
    tokenId: "genesis:range-keeper",
    categoryId: "rebalancing",
  });
  (spendy.policy as { spend: string }).spend = "1";
  const spendGate = assertIsolationAllows(createIsolation(spendy), "api.coingecko.com");
  check("non-zero spend is rejected", spendGate.ok === false);

  const closed = closeSession(session, "consumed", "plan delivered");
  check("close consumes active session", closed.status === "consumed");
  const twice = closeSession(closed, "revoked", "again");
  check("second close is a no-op", twice.status === "consumed");

  for (const cat of CATEGORIES) {
    const s = grantPlanSession({
      jobId: `job_${cat.id}`,
      chainId: 56,
      tokenId: "1",
      categoryId: cat.id,
    });
    check(
      `${cat.id} session is plan-only`,
      sessionIsSpendless(s) && s.policy.venues.length > 0,
      s.policy.venues.join(","),
    );
  }

  for (const raw of SEED_JOBS.filter((j) => j.status === "delivered")) {
    const sealed = sealJob(JSON.parse(JSON.stringify(raw)));
    const v = verifyJobReceipt(sealed);
    check(`phase0 receipt still verifies ${raw.id}`, v.ok, v.issues.join("; "));
    check(
      `receipt escrow not required ${raw.id}`,
      sealed.receipt?.escrow?.required === false,
    );
  }

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
