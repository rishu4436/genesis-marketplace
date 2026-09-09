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
  isDirectoryLeak,
  isHireableListing,
  isPublicHireableUrl,
  listingHref,
} from "../src/lib/hire-class";
import {
  agentMatchesQuery,
  filterAgents,
  queryMatchScore,
} from "../src/lib/agent-rank";
import {
  EXTRA_LIVE_SELLERS,
  FEATURED_THIRD_PARTY,
  LIVE_SELLERS,
  featuredAsAgent,
  getFeaturedThirdParty,
  isPinnedLiveSeller,
} from "../src/lib/third-party-sellers";
import { siteUrl, PRODUCTION_SITE_URL } from "../src/lib/site-url";
import {
  JOB_SKUS,
  genesisTrustBadges,
  sellerPayloadKind,
  thirdPartyTrustBadges,
} from "../src/lib/desk";
import { brainHitToAgent } from "../src/lib/brain-find";
import type { Agent } from "../src/lib/types";
import { catalogDropReason } from "../src/lib/catalog-quality";
import { classifyHealth, type HealthChecks } from "../src/lib/agent-health-model";
import { marketplaceTiers } from "../src/lib/agent-model";
import { ERC8183_MAINNET, resolveEscrowProvider } from "../src/lib/erc8183-escrow";
import { NEVER_PAY_SELLER } from "../src/lib/copy";
import { escrowJudgeProof, judgeDemoVideoUrl } from "../src/lib/judge-proof";
import { hasLivePayload, jobOutcome } from "../src/lib/job-outcome";
import { genesisToAgentCard, getGenesisAgent } from "../src/lib/genesis-agents";
import { listingPriceForAgent } from "../src/lib/listing-price";
import {
  buildExpertDeliverable,
  parseBrief,
} from "../src/lib/agent-specialists";
import type { HireJob } from "../src/lib/hire-engine";

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
    "featured LP has no invented 0.1 $U",
    listingPriceForAgent(featured)?.cta === "Buy · quote",
    listingPriceForAgent(featured)?.cta,
  );
  const brainGrid = featuredAsAgent(getFeaturedThirdParty("grid-trading"));
  check(
    "brain grid lists published 0.1 $U",
    listingPriceForAgent(brainGrid)?.cta === "Buy · 0.1 $U",
    listingPriceForAgent(brainGrid)?.cta,
  );
  check(
    "chainhelix browse CTA is quote",
    listingPriceForAgent(featuredAsAgent(EXTRA_LIVE_SELLERS[0]))?.cta ===
      "Buy · quote",
    listingPriceForAgent(featuredAsAgent(EXTRA_LIVE_SELLERS[0]))?.cta,
  );
  const rangeKeeper = getGenesisAgent("range-keeper");
  check(
    "range-keeper browse SKU is $8",
    Boolean(rangeKeeper) &&
      listingPriceForAgent(genesisToAgentCard(rangeKeeper!))?.cta ===
        "Buy · $8",
    listingPriceForAgent(genesisToAgentCard(rangeKeeper!))?.cta,
  );
  check(
    "unhireable has no list price",
    listingPriceForAgent(indexed) == null,
  );
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
    siteUrl() === PRODUCTION_SITE_URL || siteUrl().includes("localhost"),
  );
  check(
    "siteUrl ignores ephemeral Vercel hosts",
    !siteUrl().includes("-rishu4436s-projects.vercel.app"),
  );
  check(
    "toly.me vanity is dropped",
    catalogDropReason({
      ...indexed,
      name: "toly.me",
      description: "gm",
    }) === "vanity-handle",
  );
  const yieldPin = featuredAsAgent(
    EXTRA_LIVE_SELLERS.find((s) => s.slug === "bnb-yield-optimizer")!,
  );
  check("q=yield matches yield optimizer", agentMatchesQuery(yieldPin, "yield"));
  check(
    "q=zzzxxyyq matches nothing on yield pin",
    agentMatchesQuery(yieldPin, "zzzxxyyq") === false,
  );
  check(
    "garbage query filters the catalog to empty",
    filterAgents([featured, yieldPin, indexed], { q: "zzzxxyyq" }).length === 0,
  );
  check(
    "yield query does not keep the LP pin",
    filterAgents([featured, yieldPin], { q: "yield" }).every(
      (a) => String(a.token_id) !== "265375",
    ),
  );
  check(
    "yield query ranks the yield pin above zero",
    queryMatchScore(yieldPin, "yield") > queryMatchScore(featured, "yield"),
  );
  const helixPin = EXTRA_LIVE_SELLERS.find(
    (s) => s.slug === "chainhelix-rebalancer",
  )!;
  check(
    "chainhelix pin is quote-only (no rest/sample)",
    !helixPin.restBase && !helixPin.exampleUrl,
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
  check("four job SKUs", JOB_SKUS.length === 4);
  check(
    "genesis never claims bonded or insured",
    genesisTrustBadges({
      healthHireable: true,
      admissionAdmitted: true,
    }).every((b) => (b.id === "bonded" || b.id === "insured" ? b.on === false : true)),
  );
  check(
    "chainhelix is quote-only so Live badge is off",
    thirdPartyTrustBadges(sellerPayloadKind(helixPin)).every(
      (b) => b.id !== "live" || b.on === false,
    ),
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
  check(
    "BNB Grid Trader (test) is identity-only",
    isDirectoryLeak({
      ...testStub,
      name: "BNB Grid Trader (test)",
      description: "TEST DEPLOYMENT — not for production use.",
      token_id: "269233",
    }) === true,
  );
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
  check(
    "RangeKeeper has an ERC-8183 provider identity",
    Boolean(resolveEscrowProvider({ genesisSlug: "range-keeper" })?.address),
  );
  check(
    "mainnet commerce is the published ERC-8183 kernel",
    ERC8183_MAINNET.commerce.toLowerCase() ===
      "0xea4daa3100a767e86fded867729ae7446476eba6",
  );
  check(
    "copy forbids sending funds to seller addresses",
    NEVER_PAY_SELLER.toLowerCase().includes("seller"),
  );
  const jp = escrowJudgeProof();
  check(
    "judge escrow proof does not invent a fund tx",
    !jp.fundTx || /^0x[a-fA-F0-9]{64}$/.test(jp.fundTx),
  );
  check(
    "judge escrow proof does not invent a submit tx",
    !jp.submitTx || /^0x[a-fA-F0-9]{64}$/.test(jp.submitTx),
  );
  const demo = judgeDemoVideoUrl();
  check(
    "judge demo video is https or unset",
    demo === null || demo.startsWith("https://"),
  );
  check(
    "8004scan API is not a hireable RPC",
    isPublicHireableUrl("https://8004scan.io/api/v1/public/agents/1") === false,
  );
  check(
    "identity writeup is not a live payload",
    hasLivePayload({
      quote: { live: false },
      deliverable: {
        title: "Indexed identity",
        summary: "No live hire",
        sections: [{}],
      },
    }) === false,
  );
  check(
    "genesis plan is a live payload",
    hasLivePayload({
      genesisSlug: "range-keeper",
      deliverable: {
        title: "Plan",
        summary: "Do this",
        sections: [{}],
      },
    }) === true,
  );
  const qOnly = jobOutcome({
    status: "delivered",
    quote: { live: false },
    deliverable: {
      title: "Quote",
      summary: "Live payload unavailable",
      sections: [{}],
    },
  });
  check(
    "quote-only badge is not Ready",
    qOnly.kind === "quoted" && qOnly.label.includes("Quote only"),
  );
  const thirdLive = jobOutcome({
    status: "delivered",
    quote: { live: true },
    deliverable: {
      title: "Sample",
      summary: "Public sample",
      sections: [{}],
    },
  });
  check(
    "third-party sample is not Delivered",
    thirdLive.kind === "quoted" && thirdLive.label.includes("live sample"),
  );
  const memeTok = {
    name: "Brain On BNB AI ($BOBAI)",
    description:
      "AI-built deflationary meme token on BNB Chain. Fair launch on Four.Meme.",
    a2a_endpoint: "https://brainonbnb.com/.well-known/agent-card.json",
    chain_id: 56,
    token_id: "49467",
  } as Agent;
  check(
    "meme token A2A is not hireable",
    isHireableListing(memeTok) === false,
  );
  const fundedPlan = jobOutcome({
    status: "delivered",
    genesisSlug: "range-keeper",
    escrow: {
      fundTx:
        "0x9a9f3f4531668c4760b5a36a93c005ed0fb0adb93f1caca99334d97bcee7cdbe",
      chainStatus: "FUNDED",
    },
    deliverable: {
      title: "Plan",
      summary: "Bands",
      sections: [{}],
    },
  });
  check(
    "escrow funded plan is not Ready",
    fundedPlan.kind === "funded" && fundedPlan.label === "Escrow funded",
  );
  check(
    "judge demo video is youtube",
    Boolean(demo && /youtu\.be\/|youtube\.com\//.test(demo)),
  );

  const noHf = parseBrief(
    "Simulate −15% collateral shock on my Venus account; repay vs add-collateral ladder",
  );
  check("health brief without HF does not invent statedHf", noHf.statedHf == null);
  const withHf = parseBrief("HF ≈ 1.38. Simulate −18% collateral.");
  check("health brief with HF keeps the stated number", withHf.statedHf === 1.38);
  const withWallet = parseBrief(
    "Protect Venus HF for 0xD322D37a6E772ed2c4E32C53f66cd72e20480f80 after −15%",
  );
  check(
    "health brief parses a 0x wallet",
    withWallet.wallet?.toLowerCase() ===
      "0xd322d37a6e772ed2c4e32c53f66cd72e20480f80",
  );
  const hfJob = {
    id: "job_test_hf",
    task: "Simulate −15% collateral shock. Do not assume a baseline HF.",
    categoryId: "health-factor",
    agentName: "HealthSentinel",
    genesisSlug: "health-sentinel",
    status: "quoted",
    budgetUsd: "6",
  } as HireJob;
  const hfPlan = buildExpertDeliverable(
    hfJob,
    getGenesisAgent("health-sentinel"),
  );
  const blob = `${hfPlan.summary}\n${hfPlan.metrics.map((m) => m.value).join(" ")}`;
  check(
    "health plan without HF does not print 1.45",
    !blob.includes("1.45") &&
      hfPlan.metrics.some((m) => m.label === "Baseline HF" && m.value === "unavailable"),
  );
  check(
    "advantage with-agent cost is plan zero",
    ADVANTAGE_TASKS.every((t) => t.withAgent.costUsd === 0),
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
