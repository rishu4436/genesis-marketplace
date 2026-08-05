import { HireDashboard } from "@/components/HireDashboard";

export const metadata = {
  title: "My hires",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        My hires
      </h1>
      <p className="mt-2 text-sm text-white/55">
        Hire intents you confirmed in the marketplace wizard. Stored locally in
        this browser until ERC-8183 on-chain jobs are connected.
      </p>
      <div className="mt-8">
        <HireDashboard />
      </div>
    </div>
  );
}
