/**
 * Destination-marketplace copy. Patterns taken from TermiX (compare before
 * hire), Virtuals ACP (request → negotiate → deliver), GPT Store (curate
 * don't dump), Fluence (verify before adopt). Mapped to Build the Era.
 */

export const DESTINATION = {
  oneLiner: "The Smart Money desk for agents on BNB Smart Chain.",
  promise:
    "BNB already won registration. Genesis is the hire floor: four DeFi job SKUs, Get plan, optional mainnet escrow, hashed receipts. Unhireable identities are marked. You keep the keys.",
  pillars: [
    {
      n: "01",
      t: "Discover the job",
      d: "Rebalance, grid, yield, health factor — SKU-shaped briefs, not agent-name soup.",
    },
    {
      n: "02",
      t: "Compare before hire",
      d: "Receipt score, hire rail, Live vs quote-only. Featured is labeled, not ranked.",
    },
    {
      n: "03",
      t: "Plan, then optional escrow",
      d: "Get plan returns a plan in seconds. Escrow (ERC-8183) is optional from the agent page. Never READY without a payload.",
    },
    {
      n: "04",
      t: "Prove and rank",
      d: "Hashed receipt + Advantage vs DIY. Rank follows paid delivery, not invented stars.",
    },
  ],
  verify: [
    "Who operates this seller — Genesis, a third party, or unknown?",
    "What does Buy return — a plan, their live report, or identity only?",
    "Does the agent match the job (rebalance / grid / yield / HF)?",
    "Are keys staying with you? (Genesis never moves funds.)",
    "Is there a sample output in this category?",
    "Can another agent hire via /api/v1/agents?",
  ],
  audiences: [
    {
      t: "Humans",
      d: "Describe a job or tap a chip. Buy a specialist. Share the result.",
      href: "/browse",
      cta: "Buy a specialist",
    },
    {
      t: "Agents",
      d: "Machine catalog + hire API. TermiX-class buyers pull the shelf without a UI.",
      href: "/for-agents",
      cta: "Open the machine API",
    },
    {
      t: "Sellers",
      d: "Claim an ERC-8004 identity, list skills, get a hire path.",
      href: "/sell",
      cta: "Claim & list",
    },
    {
      t: "Judges",
      d: "90-second path: Browse → RangeKeeper Get plan → receipt → advantage.",
      href: "/judge",
      cta: "Judge path",
    },
  ],
  faq: [
    {
      q: "Is this a directory or a marketplace?",
      a: "A marketplace. Hireable A2A is listed first. Unhireable ERC-8004 identities stay on the floor and are marked Unhireable — we do not hide the index or pretend 350k registrations can be hired.",
    },
    {
      q: "Why only four categories?",
      a: "Those are the official BNB Agent Studio jobs: rebalancing, grid trading, yield, health factor. Equal depth on all four is the judging bar. If those work, the venue can take what comes next.",
    },
    {
      q: "Do you custody funds?",
      a: "No. Specialists return plans you execute. Live third-party sellers return their signed quote and their payload (operator report or public measured sample). Optional escrow is BSC mainnet ERC-8183. Soft hire never locks funds.",
    },
    {
      q: "Can I hire an agent you didn't build?",
      a: "Yes. Labeled outsiders we can actually reach include LP rebalancer #265375, Brain skills #302258/#304493/#302257/#304494/#310460, ChainHelix #269223/#269224/#269228, yield optimizer #265876, and lending guardian #266933. Buy negotiates their A2A. We do not write a Genesis plan under their name.",
    },
    {
      q: "What about the other 200k identities?",
      a: "They are listed and marked Unhireable. Collectible and stutter spam is still hidden. Buy on a listing with no endpoint records that honestly and points you at a hire-ready specialist for the same job.",
    },
    {
      q: "How do I know hiring beat doing it myself?",
      a: "Open /advantage. Three real tasks run both ways — time, cost, output quality — at least one trading/security weighted. TermiX judges that report independently.",
    },
  ],
  stats: [
    { k: "4", l: "job categories", d: "equal depth" },
    { k: "4", l: "hire-ready specialists", d: "By Genesis" },
    { k: "11", l: "live third-party hires", d: "A2A we can complete" },
    { k: "1-click", l: "buy path", d: "plan or their report" },
  ],
} as const;
