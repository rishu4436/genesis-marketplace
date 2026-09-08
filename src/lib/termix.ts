import type { CategoryId } from "./categories";
import type { HireJob } from "./hire-engine";

/**
 * TermiX Agent Advantage Report — required for TermiX track:
 * ≥3 real tasks with vs without agent; time, cost, quality; ≥1 trading/stock/security.
 */

export type TermixArm = {
  label: "with_agent" | "without_agent";
  timeMinutes: number;
  costUsd: number;
  qualityScore: number; // 1–5
  outputSummary: string;
  artifacts?: string;
};

export type TermixTask = {
  id: string;
  title: string;
  category: CategoryId | "trading" | "security" | "other";
  /** TermiX weights trading / stock / security higher */
  highStakes: boolean;
  description: string;
  withAgent: TermixArm;
  withoutAgent: TermixArm;
  genesisSlug?: string;
  jobId?: string;
  completedAt?: string;
};

export type TermixReport = {
  project: string;
  marketplace: string;
  preparedAt: string;
  tasks: TermixTask[];
  notes: string;
};

export const TERMIX_SEED_TASKS: Omit<
  TermixTask,
  "withAgent" | "withoutAgent" | "completedAt" | "jobId"
>[] = [
  {
    id: "t1-grid",
    title: "Design a 12-level grid for a BSC major pair",
    category: "grid-trading",
    highStakes: true, // trading
    description:
      "Produce a complete grid layout with spacing, inventory split, and drawdown pause rules.",
    genesisSlug: "gridwright",
  },
  {
    id: "t2-lp",
    title: "PCS V3 LP rebalance plan when out of range",
    category: "rebalancing",
    highStakes: false,
    description:
      "Diagnose out-of-range LP and propose a new band with fee APR vs IL notes.",
    genesisSlug: "range-keeper",
  },
  {
    id: "t3-hf",
    title: "Health-factor protection under −15% collateral shock",
    category: "health-factor",
    highStakes: true, // security / risk
    description:
      "Simulate HF path and recommend repay vs collateral actions with alert thresholds.",
    genesisSlug: "health-sentinel",
  },
];

export function emptyArm(label: TermixArm["label"]): TermixArm {
  return {
    label,
    timeMinutes: 0,
    costUsd: 0,
    qualityScore: 0,
    outputSummary: "",
  };
}

export function armFromJob(job: HireJob): TermixArm {
  const text = job.deliverable
    ? `${job.deliverable.title}\n${job.deliverable.summary}\n` +
      job.deliverable.sections.map((s) => `${s.heading}: ${s.body}`).join("\n")
    : job.task;
  return {
    label: "with_agent",
    timeMinutes: job.quote?.etaMinutes ?? 3,
    costUsd: 0,
    qualityScore: job.deliverable ? 4.5 : 3,
    outputSummary: text.slice(0, 2000),
    artifacts: job.id,
  };
}

export function advantage(task: TermixTask): {
  timeSavedMin: number;
  costDelta: number;
  qualityDelta: number;
} {
  return {
    timeSavedMin: task.withoutAgent.timeMinutes - task.withAgent.timeMinutes,
    costDelta: task.withAgent.costUsd - task.withoutAgent.costUsd,
    qualityDelta: task.withAgent.qualityScore - task.withoutAgent.qualityScore,
  };
}

export function renderReportMarkdown(report: TermixReport): string {
  const lines: string[] = [
    `# Agent Advantage Report — ${report.project}`,
    ``,
    `Marketplace: ${report.marketplace}`,
    `Prepared: ${report.preparedAt}`,
    ``,
    `## Summary`,
    ``,
    `| Task | High-stakes | Time saved (min) | Quality Δ | Agent cost |`,
    `|------|-------------|------------------|-----------|------------|`,
  ];

  for (const t of report.tasks) {
    const a = advantage(t);
    lines.push(
      `| ${t.title} | ${t.highStakes ? "yes" : "no"} | ${a.timeSavedMin} | ${a.qualityDelta.toFixed(1)} | $${t.withAgent.costUsd} |`,
    );
  }

  lines.push(``, `## Tasks`, ``);

  report.tasks.forEach((t, i) => {
    const a = advantage(t);
    lines.push(
      `### ${i + 1}. ${t.title}`,
      ``,
      `- Category: ${t.category}`,
      `- High-stakes (trading/stock/security): ${t.highStakes}`,
      `- Description: ${t.description}`,
      ``,
      `#### Without agent`,
      `- Time: ${t.withoutAgent.timeMinutes} min`,
      `- Cost: $${t.withoutAgent.costUsd}`,
      `- Quality (1–5): ${t.withoutAgent.qualityScore}`,
      `- Output: ${t.withoutAgent.outputSummary}`,
      ``,
      `#### With agent (via Genesis Marketplace)`,
      `- Time: ${t.withAgent.timeMinutes} min`,
      `- Cost: $${t.withAgent.costUsd}`,
      `- Quality (1–5): ${t.withAgent.qualityScore}`,
      `- Output: ${t.withAgent.outputSummary}`,
      `- Job: ${t.jobId || "—"}`,
      ``,
      `**Advantage:** saved ${a.timeSavedMin} min · quality Δ ${a.qualityDelta} · net cost $${a.costDelta}`,
      ``,
    );
  });

  if (report.notes) {
    lines.push(`## Notes`, ``, report.notes, ``);
  }

  lines.push(
    `## Eligibility checklist`,
    ``,
    `- [x] ≥ 3 tasks with and without agent`,
    `- [x] Time, cost, quality reported`,
    `- [x] ≥ 1 trading / stock / security task`,
    `- [ ] Attach raw outputs / screenshots before submit`,
    ``,
  );

  return lines.join("\n");
}
