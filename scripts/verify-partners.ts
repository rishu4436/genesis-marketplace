/**
 * Partner-floor checks. Run: npx --yes tsx scripts/verify-partners.ts
 */

import { PARTNERS } from "../src/lib/partners";
import { advantageHrefForHire, ADVANTAGE_TASKS } from "../src/lib/advantage-report";
import { growthLoops } from "../src/lib/growth-loops";
import {
  catalogLiveStats,
  hireClassForAgent,
  listingHref,
} from "../src/lib/hire-class";
import { filterAgents } from "../src/lib/agent-rank";
import { FEATURED_THIRD_PARTY, featuredAsAgent } from "../src/lib/third-party-sellers";
import type { Agent } from "../src/lib/types";
import { catalogDropReason } from "../src/lib/catalog-quality";
import { classifyHealth, type HealthChecks } from "../src/lib/agent-health-model";
import { marketplaceTiers } from "../src/lib/agent-model";
import { genesisToAgentCard, getGenesisAgent } from "../src/lib/genesis-agents";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  check("five partners registered", PARTNERS.length === 5, String(PARTNERS.length));
  check(
    "8004scan is the catalog partner",
    PARTNERS.some((p) => p.id === "8004scan" && p.powers.length >= 3),
  );
  check(
    "Altana is post-hire, not the buy path",
    PARTNERS.some((p) => p.id === "altana" && p.href === "/altana"),
  );
  check(
    "TermiX advantage is linked",
    PARTNERS.some((p) => p.id === "termix" && p.href === "/advantage"),
  );
  check(
    "PancakeSwap is a live-data partner",
    PARTNERS.some((p) => p.id === "pancakeswap"),
  );
  check(
    "featured A2A is labeled, not organic",
    PARTNERS.some((p) => p.id === "featured-a2a" && p.href.includes("265375")),
  );

  check("TermiX has ≥3 tasks", ADVANTAGE_TASKS.length >= 3, String(ADVANTAGE_TASKS.length));
  check(
    "range-keeper maps to LP advantage",
    advantageHrefForHire({ genesisSlug: "range-keeper" }) ===
      "/advantage#lp-rebalance",
  );

  const loops = growthLoops({
    task: "rebalance",
    jobId: "job_x",
    hireHref: "/hire",
    genesisSlug: "range-keeper",
  });
  check(
    "growth includes TermiX",
    loops.some((l) => l.id === "termix-advantage" && l.href === "/advantage"),
  );
  check(
    "growth includes Altana on the specialist",
    loops.some(
      (l) =>
        l.id === "altana-grant" && l.href === "/genesis/range-keeper#altana",
    ),
  );

  const featured = featuredAsAgent();
  check(
    "featured hire class is live",
    hireClassForAgent(featured) === "live",
  );

  const indexed: Agent = {
    ...featured,
    a2a_endpoint: null,
    token_id: "1",
    chain_id: 56,
    name: "Indexed only",
    total_feedbacks: 0,
    average_score: 0,
  };
  const liveOnly = filterAgents([featured, indexed], { live: true });
  check("live filter keeps A2A only", liveOnly.length === 1, String(liveOnly.length));

  const stats = catalogLiveStats([featured, indexed]);
  check("live stats count 1 live", stats.live === 1);
  check("live stats count 1 indexed", stats.indexed === 1);

  check(
    "featured token stays 265375",
    FEATURED_THIRD_PARTY.tokenId === "265375",
  );

  const rk = getGenesisAgent("range-keeper");
  check(
    "compare hire URL is genesis specialist",
    Boolean(rk) && listingHref(genesisToAgentCard(rk!)) === "/genesis/range-keeper",
  );
  check(
    "hinami is off-job dump",
    catalogDropReason({
      ...indexed,
      name: "ヒナミちゃん by Unibase",
      description: "Hinami-chan is blowing up on X",
    }) === "off-job",
  );

  const bound: HealthChecks = {
    identity: { ok: true, detail: "id" },
    runtime: { ok: true, detail: "rt" },
    version: { ok: true, detail: "ver" },
    mandate: { ok: true, detail: "plan" },
    evidence: { ok: true, detail: "job" },
    platform: { ok: true, detail: "Genesis APEX · Studio trial expired" },
  };
  const apex = classifyHealth(bound);
  check(
    "APEX health is Ready not Studio Live",
    apex.label === "Ready · Genesis APEX" && apex.status === "local",
  );
  check(
    "escrow tier hidden when unavailable",
    marketplaceTiers({ escrowAvailable: false }).filter((t) => t.available).every(
      (t) => t.id !== "escrow",
    ),
  );

  const failed = checks.filter((c) => !c.ok);
  console.log("");
  console.log(`Result  ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    for (const f of failed) console.error(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main();
