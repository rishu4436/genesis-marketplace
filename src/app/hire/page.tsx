import { MarketplaceHome } from "@/components/MarketplaceHome";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hire",
  description:
    "Hire from four DeFi desks — rebalance, grid, yield, health factor. Get plan is no charge. Escrow is optional.",
};

/** Hire floor: all four specialists equally. Not a RangeKeeper shortcut. */
export default function HirePage() {
  return <MarketplaceHome />;
}
