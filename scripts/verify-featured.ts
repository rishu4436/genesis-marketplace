/**
 * Phase 7 featured + growth checks.
 * Run: npx --yes tsx scripts/verify-featured.ts
 */

import { featuredNeverInOrganic, featuredSlotsForJob } from "../src/lib/featured-slots";
import { growthLoops } from "../src/lib/growth-loops";
import { decorateRankSurface } from "../src/lib/rank-surface";
import { rankGenesisForJob } from "../src/lib/job-rank";
import { JOB_CHIPS } from "../src/lib/job-chips";
import { allGenesisAgents } from "../src/lib/genesis-agents";
import {
  EXTRA_LIVE_SELLERS,
  FEATURED_THIRD_PARTY,
} from "../src/lib/third-party-sellers";

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function main() {
  const rebal = featuredSlotsForJob("rebalancing", JOB_CHIPS[0].task);
  check("rebalance has featured slots", rebal.length >= 1, String(rebal.length));
  check("featured is labeled not organic", rebal[0]?.organic === false);
  check("featured paidRank is false", rebal[0]?.paidRank === false);
  check(
    "featured lead is the LP partner listing",
    rebal[0]?.slug === FEATURED_THIRD_PARTY.slug,
  );
  check(
    "rebalance also pins Brain pricer",
    rebal.some((s) => s.slug === "brain-rebalance-pricer"),
  );

  const grid = featuredSlotsForJob("grid-trading");
  check("grid job has a labeled featured pin", grid.length >= 1, String(grid.length));
  check(
    "grid featured is Brain grid planner",
    grid[0]?.slug === "brain-grid-planner",
    grid[0]?.slug,
  );
  const yieldSlot = featuredSlotsForJob("yield-optimisation");
  check(
    "yield featured includes Brain Venus yield",
    yieldSlot.some((s) => s.slug === "brain-venus-yield"),
  );
  check(
    "yield featured includes Brain PCS fee tier",
    yieldSlot.some((s) => s.slug === "brain-pcs-fee-tier"),
  );
  const hfSlot = featuredSlotsForJob("health-factor");
  check(
    "health featured is Brain Venus HF",
    hfSlot[0]?.slug === "brain-venus-hf",
    hfSlot[0]?.slug,
  );

  const ranked = rankGenesisForJob(JOB_CHIPS[0].task);
  const surface = decorateRankSurface(ranked);
  check("organic paidRank stays false", surface.paidRank === false);
  check(
    "featured never appears in organic",
    featuredNeverInOrganic(
      surface.organic.map((o) => o.slug),
      surface.featured,
    ),
  );
  check(
    "organic is still only the job specialist",
    surface.organic.every((o) => o.categoryId === "rebalancing"),
  );
  check("growth includes compare", surface.growth.some((g) => g.id === "compare-job"));
  check("growth includes package", surface.growth.some((g) => g.id === "package"));

  const loops = growthLoops({
    task: "rebalance",
    jobId: "job_x",
    hireHref: "/hire",
  });
  check(
    "share loop does not point at rank",
    loops.some((l) => l.id === "share-receipt" && l.href.includes("/jobs/")),
  );

  check(
    "extra live pins are not labeled featured slots",
    EXTRA_LIVE_SELLERS.filter((s) => s.categoryId === "rebalancing").every(
      (s) => !rebal.some((f) => f.slug === s.slug),
    ),
  );
  check("four specialists still exist", allGenesisAgents().length === 4);
  check(
    "featured slug is not a genesis specialist",
    !allGenesisAgents().some((a) => a.slug === FEATURED_THIRD_PARTY.slug),
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
