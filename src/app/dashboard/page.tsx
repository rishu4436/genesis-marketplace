import Link from "next/link";
import { HireDashboard } from "@/components/HireDashboard";
import { SoftHireNote } from "@/components/SoftHireNote";
import { PartnerStatusStrip } from "@/components/PartnerStatusStrip";

export const metadata = {
  title: "My hires",
};

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="section-label">My hires</p>
          <h1 className="display-section mt-3 text-white">Your plans</h1>
          <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-white/50">
            Sign in from the header (email or wallet) and hires follow you to
            any browser. Or skip the account and keep a claim code / result
            link.
          </p>
          <SoftHireNote className="mt-5 max-w-xl" />
        </div>
        <Link href="/hire" className="btn-solid">
          Hire
        </Link>
      </div>

      <div className="mt-8">
        <PartnerStatusStrip compact />
      </div>

      <div className="mt-10">
        <HireDashboard />
      </div>
    </div>
  );
}
