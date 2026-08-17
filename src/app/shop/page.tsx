import { MarketplaceHome } from "@/components/MarketplaceHome";

export const metadata = {
  title: "Shop",
  description:
    "Find and hire DeFi agents on BNB Smart Chain — four jobs, equal depth.",
};

export const revalidate = 90;

export default function ShopPage() {
  return <MarketplaceHome />;
}
