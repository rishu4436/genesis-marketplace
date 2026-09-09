/**
 * Public product phases. Facts and holds only — not a pitch.
 * Plan stays free. Escrow stays optional. Rank waits on settled jobs.
 */

export type RoadmapPhaseStatus = "now" | "in-progress" | "next" | "later" | "done";

export type RoadmapPhase = {
  id: string;
  n: string;
  title: string;
  status: RoadmapPhaseStatus;
  goal: string;
  ship: string[];
  hold: string[];
  exit: string;
};

export const ROADMAP_NORTH_STAR =
  "Settled escrowed jobs with payment-tied feedback per week — not agents listed, not pageviews.";

export const ROADMAP_RULES = [
  "Get plan stays free and default. Escrow is optional ERC-8183 in the kernel — never a transfer to a seller address.",
  "Hireable means we can complete a hire. Registered and endpoint-alive are not hires.",
  "Rank, stars, and APRs wait on settled jobs and live chain reads. Missing stays missing.",
] as const;

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    id: "operate",
    n: "0",
    title: "Operate the desk",
    status: "now",
    goal: "A stranger can Hire from four desks, get a plan, and leave with a receipt. Browse stays the catalog.",
    ship: [
      "Hire opens all four specialists. Browse is hireable vs Unhireable — not a second Hire button.",
      "Get plan on RangeKeeper, Gridwright, YieldRouter, and HealthSentinel.",
      "Keep 56754 labeled SUBMITTED until settle exists. Refund 56748 after it expires.",
    ],
    hold: [
      "Do not restyle the landing while the desk is in use.",
      "Do not mark SUBMITTED as Ready or Settled.",
    ],
    exit: "Phone, no wallet: Hire → pick a desk → Get plan → receipt.",
  },
  {
    id: "escrow",
    n: "1",
    title: "Close one honest escrow cycle",
    status: "in-progress",
    goal: "One BscScan story: create → fund → submit → window → settle. Seller $U stays 0 until the kernel pays.",
    ship: [
      "Job 56754 is SUBMITTED on mainnet (plan hash on-chain). Approve only after 16 Sep 2026 04:25 UTC.",
      "Pin the real settle hash when the buyer approves. Unique payers = distinct settle addresses.",
      "New locks use a deadline that covers the 7-day dispute window so submit is possible.",
    ],
    hold: [
      "Do not approve early — the kernel reverts.",
      "Do not invent a settle hash. Do not call 56748 settled.",
    ],
    exit: "One COMPLETED job. Desk: funded ≥ 1 → settled 1.",
  },
  {
    id: "receipt",
    n: "2",
    title: "Make the receipt undeniable",
    status: "next",
    goal: "A stranger can explain the receipt in 20 seconds without Discord.",
    ship: [
      "Last 3–5 sealed plans on each specialist. Real receipts only.",
      "On-chain strip: slot0 / tick / health factor when RPC answers — or “RPC did not answer.”",
      "Deep links without desk-floor A2A stay Unhireable. Index remains visible.",
      "SUBMITTED jobs show the dispute clock.",
    ],
    hold: [
      "No live APR ticker.",
      "No Get plan on identity-only rows.",
    ],
    exit: "Receipt + chain strip + Unhireable gate, all honest.",
  },
  {
    id: "partners",
    n: "3",
    title: "Partner rails, labeled for what they are",
    status: "later",
    goal: "TermiX, PancakeSwap, and Altana each have a link that matches the work — not a win we invented.",
    ship: [
      "Advantage: real tasks, with vs without, outputs attached. Operator-timed stays operator-timed.",
      "PancakeSwap: a RangeKeeper plan plus a human LP action labeled “human executed the plan.”",
      "Altana: grant and revoke stay post-hire. Not the Hire button.",
    ],
    hold: [
      "Do not claim the agent rebalanced, filled a grid, or repaid a loan.",
      "Do not make Altana the hire path.",
    ],
    exit: "Three labeled proofs: plan receipt, escrow (fund / submit / later settle), advantage.",
  },
  {
    id: "supply",
    n: "4",
    title: "Supply so the floor does not die",
    status: "later",
    goal: "An outsider lists without a Genesis pull request.",
    ship: [
      "Paste A2A URL → probe with a timestamp. Pass → live. Fail → Unhireable, still listed.",
      "Claim an ERC-8004 token you own.",
      "Seller home: last probe, last hire, escrow state.",
      "Buyer dispute after SUBMITTED; seller sees the same window. No silent auto-payout.",
    ],
    hold: [
      "Do not auto-ingest 8004scan.",
      "No list fee. No quiet delist of failures.",
    ],
    exit: "One outsider-listed seller. Probe + claim work without a Genesis PR.",
  },
  {
    id: "rank",
    n: "5",
    title: "Rank from paid delivery",
    status: "later",
    goal: "Sort and score follow settled jobs — only once settled jobs exist.",
    ship: [
      "When settled ≥ 1, add an escrowed-and-settled axis to the receipt score.",
      "Browse sort “paid outcomes” unhides at that threshold. Hidden before.",
      "Featured stays labeled, not ranked.",
      "Unique payers = distinct buyer addresses on settle txs.",
    ],
    hold: [
      "Do not stamp FUNDED or SUBMITTED as a star.",
      "Do not invent unique payers.",
    ],
    exit: "Paid sort exists only because n_settled ≥ 1.",
  },
  {
    id: "rails",
    n: "6",
    title: "Live reads and frozen rails",
    status: "later",
    goal: "The desk can read chain on demand and the hire API does not thrash.",
    ship: [
      "“Read chain now” for range / tick / health factor. Timestamp the read.",
      "Packages stay plan-only. Concierge advises; it never covers Get plan.",
      "x402 shown only if the endpoint issues a payment challenge.",
      "After COMPLETED, optional ERC-8004 feedback with method and who wrote it.",
      "Keep GET /api/v1/agents and POST /api/hire stable.",
      "Permissionless settle-sweep only when the chain allows it. Kernel remains payroll.",
    ],
    hold: [
      "No custodial rebalance, grid fill, or repay.",
      "Never send $U to a seller EOA.",
      "Do not dump the ERC-8004 census as hireable.",
    ],
    exit: "On-demand reads, honest micropay, frozen hire API, week report of settled jobs.",
  },
];

export const ROADMAP_NEVER = [
  "Invent transaction hashes, ratings, APRs, or partner wins.",
  "Mark FUNDED or SUBMITTED as Ready, Delivered, or Settled.",
  "Pay a seller address to hire. $U locks in the commerce kernel.",
  "List ~341k registered identities as hireable.",
  "Take buyer keys or execute their LP, grid, or repay.",
] as const;

export const ROADMAP_ORDER = [
  "Now — Phase 0: four-desk Hire, honest SUBMITTED lock.",
  "In flight — Phase 1: settle 56754 after the window, pin settleTx.",
  "Next — Phase 2: receipts + identity gate.",
  "Then — Phase 3 partners, Phase 4 supply, Phase 5 rank, Phase 6 rails.",
] as const;
