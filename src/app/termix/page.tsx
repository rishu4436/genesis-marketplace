import { TermixWorkbench } from "@/components/TermixWorkbench";

export const metadata = {
  title: "TermiX Agent Advantage Report",
};

export default function TermixPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-white">
        TermiX · Agent Advantage Report
      </h1>
      <p className="mt-2 text-sm text-white/55">
        Required for the TermiX track ($6k / $3k / $1k). Run ≥3 tasks with vs
        without an agent; include time, cost, quality; ≥1 trading or security
        task. Hire Genesis agents to fill the “with agent” arm automatically.
        The same report is linked from every job receipt.
      </p>
      <p className="mt-3 text-[12px] text-white/40">
        Also on the{" "}
        <a href="/advantage" className="text-amber-300 hover:underline">
          advantage page
        </a>{" "}
        and{" "}
        <a href="/partners#termix" className="text-amber-300 hover:underline">
          partner hub
        </a>
        .
      </p>
      <div className="mt-8">
        <TermixWorkbench />
      </div>
    </div>
  );
}
