/**
 * Partner-floor checks. Run: npx --yes tsx scripts/verify-partners.ts
 */

import { PARTNERS } from "../src/lib/partners";
import { advantageHrefForHire, ADVANTAGE_TASKS } from "../src/lib/advantage-report";
import { growthLoops } from "../src/lib/growth-loops";
import {
  catalogLiveStats,
  hireClassForAgent,
  hireClassLabel,
  hireRailLabel,
  isHireableListing,
  isPublicHireableUrl,
  listingHref,
} from "../src/lib/hire-class";
import { filterAgents } from "../src/lib/agent-rank";
import {
  EXTRA_LIVE_SELLERS,
  FEATURED_THIRD_PARTY,
  LIVE_SELLERS,
  featuredAsAgent,
  isPinnedLiveSeller,
} from "../src/lib/third-party-sellers";
import { siteUrl, PRODUCTION_SITE_URL } from "../src/lib/site-url";
import { brainHitToAgent } from "../src/lib/brain-find";
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

  check("TermiX has 4 tasks (one per job)", ADVANTAGE_TASKS.length === 4, String(ADVANTAGE_TASKS.length));
  check(
    "yield-router maps to yield advantage",
    advantageHrefForHire({ genesisSlug: "yield-router" }) ===
      "/advantage#usdt-yield",
  );
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
  check("featured is hireable", isHireableListing(featured) === true);
  check("identity-only is not hireable", isHireableListing(indexed) === false);
  check(
    "indexed class label is Unhireable",
    hireClassLabel("indexed") === "Unhireable",
  );
  check(
    "genesis hire rail is APEX plan hire",
    hireRailLabel("genesis") === "Genesis APEX · plan hire",
  );
  check(
    "canonical host is -one",
    PRODUCTION_SITE_URL.includes("genesis-marketplace-one.vercel.app"),
  );
  check(
    "siteUrl never emits stale alias",
    siteUrl().includes("genesis-marketplace-one") ||
      siteUrl().includes("localhost"),
  );
  check(
    "toly.me vanity is dropped",
    catalogDropReason({
      ...indexed,
      name: "toly.me",
      description: "gm",
    }) === "vanity-handle",
  );
  check(
    "bedrock AgentCore URL is not hireable",
    isPublicHireableUrl(
      "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn:aws:bedrock-agentcore:us-east-1:1:runtime/x/invocations",
    ) === false,
  );
  check(
    "s3 card URL is not a hireable RPC",
    isPublicHireableUrl(
      "https://rangereset-deliverables-899042279537.s3.us-east-1.amazonaws.com/.well-known/agent-card.json",
    ) === false,
  );
  check(
    "IAM execute-api is not hireable",
    isPublicHireableUrl(
      "https://gvwyso8occ.execute-api.us-east-1.amazonaws.com/a2a",
    ) === false,
  );
  check("five extra live pins", EXTRA_LIVE_SELLERS.length === 5);
  check("eleven live third-party pins", LIVE_SELLERS.length === 11);
  const helix = brainHitToAgent(
    {
      id: 269223,
      name: "Portfolio Rebalancer",
      speaks: ["a2a"],
      endpoints: [
        "https://agents.chainhelix.io/rebalancer/.well-known/agent-card.json",
      ],
    },
    "rebalancing",
  );
  check("brain find helix is hireable", Boolean(helix && isHireableListing(helix)));
  const sentinels = brainHitToAgent(
    {
      id: 325413,
      name: "Sentinels LP Rebalancer",
      speaks: [],
      endpoints: [
        "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn:aws:bedrock-agentcore:us-east-1:1:runtime/x/invocations/.well-known/agent-card.json",
      ],
    },
    "rebalancing",
  );
  check(
    "brain find sentinels is unhireable",
    Boolean(sentinels && isHireableListing(sentinels) === false),
  );
  const rangeReset = brainHitToAgent(
    {
      id: 324818,
      name: "RangeReset",
      speaks: ["a2a"],
      endpoints: [
        "https://rangereset-deliverables-899042279537.s3.us-east-1.amazonaws.com/.well-known/agent-card.json",
        "https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn:aws:bedrock-agentcore:us-east-1:1:runtime/rangereset/invocations",
      ],
    },
    "rebalancing",
  );
  check(
    "brain find RangeReset (bedrock) is unhireable",
    Boolean(rangeReset && isHireableListing(rangeReset) === false),
  );
  check(
    "chainhelix rebalancer is pinned live",
    isPinnedLiveSeller(56, "269223") === true,
  );
  check(
    "yield optimizer pin is hireable",
    isHireableListing(featuredAsAgent(EXTRA_LIVE_SELLERS[3])) === true,
  );
  check(
    "extra live is not the featured LP slot",
    EXTRA_LIVE_SELLERS.every((s) => s.tokenId !== FEATURED_THIRD_PARTY.tokenId),
  );
  const testStub: Agent = {
    ...featured,
    name: "test.agent",
    token_id: "302610",
    a2a_endpoint: "https://example.invalid/agent-card.json",
  };
  check("test.agent is not hireable", isHireableListing(testStub) === false);
  const sleepBot: Agent = {
    ...featured,
    name: "DeFiBot.agent",
    description: "Automate grid trading, DCA, and yield compounding across major DEXs while you sleep.",
    a2a_endpoint: "https://api.8004scan.io/agents/1",
  };
  check("generic sleep-bot is not hireable", isHireableListing(sleepBot) === false);
  const namedTest: Agent = {
    ...featured,
    name: "bnb-grid-trader-test.agent",
    token_id: "292939",
    a2a_endpoint: "https://api.8004scan.io/agents/2",
  };
  check(
    "bnb-grid-trader-test.agent is not hireable",
    isHireableListing(namedTest) === false,
  );
  check("split hireable count", stats.hireable === 1);
  check("split identity count", stats.identity === 1);

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
