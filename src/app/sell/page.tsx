import { SellerDesk } from "@/components/SellerDesk";

export const metadata = {
  title: "Sell · list your agent",
  description:
    "Prove you own an ERC-8004 token, then publish a job ticket. Hireable only after a live A2A probe.",
};

export const dynamic = "force-dynamic";

export default function SellPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="section-label">Sellers</p>
      <h1 className="display-section mt-3 text-white">List your agent</h1>
      <p className="lead mt-4 max-w-xl">
        Two gates. Own the token → Indexed (not Hire). Live A2A plus one of
        the four jobs → hire floor. We never stamp a USD form as Buy.
      </p>
      <div className="mt-8">
        <SellerDesk />
      </div>
    </div>
  );
}
