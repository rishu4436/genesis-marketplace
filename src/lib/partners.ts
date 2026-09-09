/**
 * Hackathon partner registry — what each integration powers on the floor.
 * Keep this file client-safe (no Node / env / network).
 */

export type PartnerId =
  | "8004scan"
  | "altana"
  | "termix"
  | "pancakeswap"
  | "featured-a2a";

export type PartnerDef = {
  id: PartnerId;
  name: string;
  track: string;
  role: string;
  href: string;
  docs?: string;
  powers: string[];
};

export const PARTNERS: PartnerDef[] = [
  {
    id: "8004scan",
    name: "8004scan",
    track: "Catalog + ratings",
    role: "ERC-8004 identity index for BSC. Hire readiness, ratings, and the wider catalog come from here.",
    href: "/partners#8004scan",
    docs: "https://8004scan.io/developers",
    powers: [
      "Browse catalog (hireable vs Unhireable)",
      "On-chain ratings (never invented)",
      "5-axis hire readiness",
    ],
  },
  {
    id: "altana",
    name: "Altana",
    track: "Session keys",
    role: "Scoped, revocable Keystore grants after a hire. Not the buy path — a permission grant on the same specialist.",
    href: "/altana",
    docs: "https://docs.altana.network",
    powers: [
      "Post-hire session grant",
      "Per-specialist spend allowlist",
      "Revoke in-product",
    ],
  },
  {
    id: "termix",
    name: "TermiX",
    track: "Advantage report",
    role: "With-agent vs without-agent proof. Linked from the job receipt, not a side page only judges know about.",
    href: "/advantage",
    docs: "/termix",
    powers: [
      "Four tasks, one per job",
      "Receipt-linked proof",
      "Trading + security stakes",
    ],
  },
  {
    id: "pancakeswap",
    name: "PancakeSwap",
    track: "Live market data",
    role: "PCS V3 slot0 on hire plans (BNB/USDT, CAKE/USDT). Failures stay labeled unavailable — we do not invent a tick.",
    href: "/partners#pancakeswap",
    docs: "https://docs.pancakeswap.finance",
    powers: [
      "RangeKeeper band math",
      "Live slot0 in receipts",
      "Featured LP rebalancer",
    ],
  },
  {
    id: "featured-a2a",
    name: "BNB LP Rebalancer",
    track: "Live third-party",
    role: "Labeled featured LP seller — not organic rank. Live A2A we can complete (Brain, ChainHelix, and this LP pin). Featured stays labeled.",
    href: "/agents/56/265375#buy",
    powers: [
      "A2A negotiate + quote",
      "Operator REST report",
      "Featured pin stays labeled",
    ],
  },
];

export function getPartner(id: PartnerId): PartnerDef {
  const p = PARTNERS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown partner ${id}`);
  return p;
}
