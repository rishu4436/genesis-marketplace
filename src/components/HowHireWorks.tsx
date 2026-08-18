import Link from "next/link";

/**
 * Who sells, what buy does, money path.
 * Keep short — used on /hire, agent sidebars.
 */
export function HowHireWorks({ compact = false }: { compact?: boolean }) {
  const steps = [
    {
      t: "Pick who to hire",
      d: "Four By Genesis specialists first — one per job — then hireable 8004scan listings. Featured stays labeled, not ranked.",
    },
    {
      t: "Hire",
      d: "Describe the job once. You get a structured plan — no multi-step negotiation.",
    },
    {
      t: "Keep the keys",
      d: "The plan lands under My hires. Soft hire only: no custody, escrow is not live.",
    },
  ];

  if (compact) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-[11px] leading-relaxed text-white/50">
        <p className="font-semibold text-white/70">Hire</p>
        <p className="mt-1">
          One click → plan. Saved under{" "}
          <Link href="/dashboard" className="text-amber-300 hover:underline">
            My hires
          </Link>
          . Soft hire · no custody.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <p className="section-label">How this marketplace works</p>
      <h2 className="mt-2 font-display text-xl font-bold text-white">
        Pick. Hire. Plan.
      </h2>
      <ol className="mt-5 space-y-4">
        {steps.map((s, i) => (
          <li key={s.t} className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F0B90B] text-xs font-bold text-black">
              {i + 1}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{s.t}</h3>
              <p className="mt-0.5 text-xs leading-relaxed text-white/55">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-50/90">
          <span className="font-bold text-[#F0B90B]">By Genesis</span> = hire-ready
          seller (we operate + pin).
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white/55">
          <span className="font-semibold text-white/75">Indexed</span> = on-chain
          identity in the catalog. Buy still works (structured brief).
        </div>
      </div>
    </section>
  );
}
