/**
 * Phase 1 identity + health checks.
 * Run: npx --yes tsx scripts/verify-seller-identity.ts
 */

import { allGenesisAgents } from "../src/lib/genesis-agents";
import {
  hashIdentity,
  identityFromGenesis,
} from "../src/lib/seller-identity";
import {
  apexHealthMatchesIdentity,
  apexHealthPayload,
} from "../src/lib/apex-health";
import {
  classifyHealth,
  type HealthChecks,
} from "../src/lib/agent-health-model";
import { CATEGORIES } from "../src/lib/categories";
import { SEED_JOBS } from "../src/lib/seed-jobs";
import { sealJob, verifyJobReceipt } from "../src/lib/job-receipt";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function boundChecks(over: Partial<HealthChecks> = {}): HealthChecks {
  const base: HealthChecks = {
    identity: { ok: true, detail: "id" },
    runtime: { ok: true, detail: "rt" },
    version: { ok: true, detail: "ver" },
    mandate: { ok: true, detail: "man" },
    evidence: { ok: true, detail: "ev" },
    platform: { ok: false, detail: "off" },
  };
  return { ...base, ...over };
}

function main() {
  const agents = allGenesisAgents();
  check("four specialists", agents.length === 4, String(agents.length));
  check(
    "one specialist per hackathon category",
    CATEGORIES.every((c) => agents.some((a) => a.categoryId === c.id)),
  );

  for (const agent of agents) {
    const id = identityFromGenesis(agent);
    check(`${agent.slug} has ERC-8004 token`, id.erc8004, id.tokenId || "");
    check(`${agent.slug} has controller`, Boolean(id.controller), id.controller || "");
    check(
      `${agent.slug} mandate forbids funds`,
      id.mandate.custody === false &&
        id.mandate.mayMoveFunds === false &&
        id.mandate.output === "structured-plan",
    );
    check(
      `${agent.slug} version is pinned`,
      id.version === `${agent.slug}@specialist-plan-v1`,
      id.version,
    );
    check(
      `${agent.slug} identity hash is 64 hex`,
      /^[a-f0-9]{64}$/.test(id.identityHash),
    );

    const again = identityFromGenesis(agent);
    check(
      `${agent.slug} identity hash is stable`,
      again.identityHash === id.identityHash,
    );

    const shuffled = hashIdentity({
      sellerId: id.sellerId,
      controller: id.controller,
      chainId: id.chainId,
      tokenId: id.tokenId,
      version: id.version,
      categoryId: id.categoryId,
      capabilities: [...id.capabilities].reverse(),
      mandate: id.mandate,
    });
    check(`${agent.slug} capability order does not change hash`, shuffled === id.identityHash);

    const swapped = hashIdentity({
      sellerId: id.sellerId,
      controller: "0x000000000000000000000000000000000000dEaD",
      chainId: id.chainId,
      tokenId: id.tokenId,
      version: id.version,
      categoryId: id.categoryId,
      capabilities: id.capabilities,
      mandate: id.mandate,
    });
    check(`${agent.slug} controller swap changes hash`, swapped !== id.identityHash);

    const newToken = hashIdentity({
      sellerId: id.sellerId,
      controller: id.controller,
      chainId: id.chainId,
      tokenId: "999999",
      version: id.version,
      categoryId: id.categoryId,
      capabilities: id.capabilities,
      mandate: id.mandate,
    });
    check(`${agent.slug} token swap changes hash`, newToken !== id.identityHash);

    const payload = apexHealthPayload(agent.slug);
    check(`${agent.slug} APEX payload exists`, Boolean(payload));
    if (payload) {
      const match = apexHealthMatchesIdentity(payload, {
        slug: agent.slug,
        version: id.version,
        identityHash: id.identityHash,
      });
      check(`${agent.slug} APEX payload matches identity`, match.ok, match.detail);
      const drift = apexHealthMatchesIdentity(
        { ...payload, version: "tampered@v0" },
        {
          slug: agent.slug,
          version: id.version,
          identityHash: id.identityHash,
        },
      );
      check(`${agent.slug} APEX version drift is detected`, drift.ok === false);
    }
  }

  const live = classifyHealth(boundChecks({ platform: { ok: true, detail: "up" } }));
  check("bound + platform = Live", live.status === "live" && live.label === "Live");

  const ready = classifyHealth(boundChecks());
  check(
    "bound without platform = Ready, not Live",
    ready.status === "local" && ready.label === "Ready",
  );

  const drift = classifyHealth(
    boundChecks({ version: { ok: false, detail: "mismatch" } }),
  );
  check("version mismatch = Drift", drift.status === "degraded" && drift.label === "Drift");

  const identOnly = classifyHealth(
    boundChecks({
      runtime: { ok: false, detail: "down" },
      version: { ok: false, detail: "n/a" },
    }),
  );
  check(
    "identity without runtime is not Live",
    identOnly.status !== "live" && identOnly.label !== "Live",
  );

  for (const raw of SEED_JOBS.filter((j) => j.genesisSlug)) {
    const sealed = sealJob(JSON.parse(JSON.stringify(raw)));
    const v = verifyJobReceipt(sealed);
    check(`phase0 receipt still verifies ${raw.id}`, v.ok, v.issues.join("; "));
    check(
      `phase0+1 identityHash present ${raw.id}`,
      Boolean(sealed.receipt?.identityHash),
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
