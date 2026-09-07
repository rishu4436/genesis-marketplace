/**
 * P0 C: recommendation CTAs must open the agent page without auto-hire.
 * Run: npx --yes tsx scripts/verify-recommendation-cta.ts
 */

import { allGenesisAgents, genesisBuyHref, hrefAutoHires } from "../src/lib/genesis-agents";
import { matchAgentsForJob } from "../src/lib/intent-match";
import { listingToMatchShape, rankGenesisForJob } from "../src/lib/job-rank";
import { allFeaturedSlots, featuredSlotsForJob } from "../src/lib/featured-slots";
import { conciergeChat, orchestrateHire } from "../src/lib/ai/intelligence";
import { catalogRecordMatchesQuery } from "../src/lib/catalog-search";
import { jobOutcome } from "../src/lib/job-outcome";
import { listVsQuoted } from "../src/lib/sku-label";
import type { HireJob } from "../src/lib/hire-engine";
import { PARTNERS } from "../src/lib/partners";
import { LIVE_SELLERS } from "../src/lib/third-party-sellers";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function assertNoAutoHire(label: string, href: string) {
  check(
    `${label} does not auto-hire`,
    !hrefAutoHires(href),
    href,
  );
}

async function main() {
  const task = "Rebalance my PCS V3 BNB/USDT LP when out of range";
  const ranked = rankGenesisForJob(task);
  for (const row of [...ranked.organic, ...ranked.excluded]) {
    assertNoAutoHire(`job-rank ${row.slug}`, row.buyHref);
    const shaped = listingToMatchShape(row, ranked.task);
    assertNoAutoHire(`match-shape ${row.slug}`, shaped.buyHref);
  }

  const matched = matchAgentsForJob(task, 3);
  for (const m of matched.matches) {
    assertNoAutoHire(`intent-match ${m.agent.slug}`, m.buyHref);
  }

  for (const f of featuredSlotsForJob("rebalancing", task)) {
    assertNoAutoHire(`featured ${f.slug}`, f.buyHref);
  }
  for (const f of allFeaturedSlots()) {
    assertNoAutoHire(`featured-all ${f.slug}`, f.buyHref);
  }

  const orch = await orchestrateHire({ query: task });
  for (const p of orch.picks) {
    assertNoAutoHire(`orchestrate ${p.slug}`, p.buyHref);
  }

  const concierge = await conciergeChat({
    message: "I need a PCS LP rebalance plan",
  });
  for (const p of concierge.picks) {
    assertNoAutoHire(`concierge pick ${p.slug}`, p.buyHref);
  }
  if (concierge.cta?.href) {
    assertNoAutoHire("concierge Open CTA", concierge.cta.href);
  }

  const judgeCold = genesisBuyHref(allGenesisAgents()[0], {
    task,
    buy: true,
  });
  check(
    "judge cold path may still set buy=1",
    hrefAutoHires(judgeCold),
    judgeCold,
  );

  for (const p of PARTNERS) {
    assertNoAutoHire(`partner ${p.id}`, p.href);
  }
  for (const s of LIVE_SELLERS) {
    check(
      `live seller ${s.slug} listing is not auto-hire`,
      !hrefAutoHires(`/agents/${s.chainId}/${s.tokenId}#buy`),
    );
  }

  check(
    "yield query matches a specialist",
    catalogRecordMatchesQuery(
      {
        name: "YieldRouter",
        slug: "yield-router",
        tagline: "Park idle USDT",
        categoryId: "yield-optimisation",
        tokenId: "336624",
      },
      "yield",
    ),
  );
  check(
    "nonsense query matches nothing",
    catalogRecordMatchesQuery(
      {
        name: "RangeKeeper",
        slug: "range-keeper",
        tagline: "PCS V3 LP ranges",
        categoryId: "rebalancing",
        tokenId: "336622",
      },
      "zzzzqwerty999nofit",
    ) === false,
  );

  const disputed = jobOutcome({
    status: "delivered",
    genesisSlug: "range-keeper",
    deliverable: {
      title: "Plan",
      summary: "Do this",
      sections: [{}],
    },
    decision: { state: "disputed" },
  });
  check(
    "disputed is not Ready/Delivered",
    disputed.kind === "disputed" &&
      !/ready|delivered/i.test(disputed.label),
    disputed.label,
  );

  const quoted = listVsQuoted({
    genesisSlug: "range-keeper",
    quote: { priceUsd: 7.6, listSkuUsd: 8 },
  } as HireJob);
  check(
    "list vs quoted surfaces both amounts",
    quoted.listUsd === 8 && quoted.quotedUsd === 7.6,
    `${quoted.listUsd}/${quoted.quotedUsd}`,
  );

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

void main();
