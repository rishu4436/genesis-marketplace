import { MarketplaceHome } from "@/components/MarketplaceHome";

export const metadata = {
  title: "Shop",
  description:
    "Four hire-ready specialists. Four DeFi jobs. One-click plan — you keep the keys.",
};

export const revalidate = 90;

export default function ShopPage() {
  return <MarketplaceHome />;
}
