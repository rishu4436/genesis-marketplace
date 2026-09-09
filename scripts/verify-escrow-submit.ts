/**
 * Phase 1: on-chain submit encoding + settle gate.
 * Run: npx --yes tsx scripts/verify-escrow-submit.ts
 */

import {
  bytes32FromSha256,
  canSubmitOnchain,
  encodeSettleApprove,
  encodeSubmit,
  ERC8183_MAINNET,
  escrowUiPhase,
} from "../src/lib/erc8183-escrow";
import { jobOutcome } from "../src/lib/job-outcome";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  const hash = "a".repeat(64);
  const deliverable = bytes32FromSha256(hash);
  check("bytes32FromSha256 accepts 64 hex", Boolean(deliverable?.startsWith("0x") && deliverable.length === 66));
  check("bytes32FromSha256 rejects short", bytes32FromSha256("abc") === null);
  check("bytes32FromSha256 rejects empty", bytes32FromSha256("") === null);

  const call = encodeSubmit({
    jobId: 56748n,
    deliverable: deliverable!,
    receiptUrl: "https://genesis-marketplace-one.vercel.app/jobs/job_mtsv2f9d_9yjpwg",
  });
  check("submit targets commerce kernel", call.to.toLowerCase() === ERC8183_MAINNET.commerce.toLowerCase());
  check("submit calldata is non-empty", call.data.startsWith("0x") && call.data.length > 10);

  const settle = encodeSettleApprove(56748n);
  check("settle targets router not commerce", settle.to.toLowerCase() === ERC8183_MAINNET.router.toLowerCase());
  check("submit ≠ settle selector", call.data.slice(0, 10) !== settle.data.slice(0, 10));

  const funded = jobOutcome({
    genesisSlug: "range-keeper",
    status: "delivered",
    deliverable: { title: "Plan", summary: "Band", sections: [{}] },
    escrow: { fundTx: `0x${"b".repeat(64)}`, chainStatus: "FUNDED" },
  });
  check("funded escrow is not Ready", funded.kind === "funded", funded.label);

  const submitted = jobOutcome({
    genesisSlug: "range-keeper",
    status: "delivered",
    deliverable: { title: "Plan", summary: "Band", sections: [{}] },
    escrow: { fundTx: `0x${"b".repeat(64)}`, chainStatus: "SUBMITTED" },
  });
  check("submitted escrow is not Ready", submitted.kind === "working", submitted.label);

  const phase = escrowUiPhase({
    chainStatus: "FUNDED",
    hasPayload: true,
  });
  check("FUNDED+payload UI phase is funded", phase === "funded", phase);

  const windowPhase = escrowUiPhase({
    chainStatus: "SUBMITTED",
    hasPayload: true,
    submittedAt: Math.floor(Date.now() / 1000) - 60,
    disputeWindowSeconds: 604800,
  });
  check("SUBMITTED in window is dispute-window", windowPhase === "dispute-window", windowPhase);

  const now = Math.floor(Date.now() / 1000);
  check(
    "submit allowed when expiry covers dispute window",
    canSubmitOnchain({
      statusName: "FUNDED",
      expiredAt: now + 8 * 24 * 3600,
      disputeWindowSeconds: 7 * 24 * 3600,
      nowSec: now,
    }),
  );
  check(
    "submit blocked when expiry is inside the dispute window (56748 case)",
    canSubmitOnchain({
      statusName: "FUNDED",
      expiredAt: now + 6 * 24 * 3600,
      disputeWindowSeconds: 7 * 24 * 3600,
      nowSec: now,
    }) === false,
  );

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nResult  ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

main();
