"use client";

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { LandingBackground } from "@/components/landing/LandingBackground";
import { FadeIn, useLenis } from "@/components/landing/ui";
import { CATEGORIES } from "@/lib/categories";
import { GENESIS_AGENTS, genesisHref, HIRE_NOW_HREF } from "@/lib/genesis-agents";
import { getCategory } from "@/lib/categories";

const STEPS = [
  {
    t: "Name the job",
    d: "Rebalance, grid, yield, or health factor — pick the work, not a directory.",
  },
  {
    t: "Hire a specialist",
    d: "One By Genesis operator per job. Price and ETA up front.",
  },
  {
    t: "Take the plan",
    d: "Structured brief back. You keep the keys. Escrow is not live.",
  },
];

/**
 * Genesis hire-floor landing — BNB market desk, not a protocol manifesto.
 */
export function LandingPage() {
  const reduce = useReducedMotion();
  useLenis(!reduce);

  return (
    <div className="relative w-full overflow-x-hidden bg-transparent">
      <LandingBackground />

      <section className="relative px-4 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24">
        <div className="mx-auto max-w-6xl">
          <p className="section-label text-[#F0B90B]/70">
            BNB Chain · Build the Era
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.8rem,8vw,5.4rem)] font-bold leading-[0.96] tracking-[-0.045em] text-white">
            Hire the agent.
            <br />
            <span className="em-accent">Keep the keys.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-relaxed text-white/55 sm:text-lg">
            Four DeFi specialists we operate on BNB Smart Chain. One brief.
            A plan you execute. Soft hire — no custody.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href={HIRE_NOW_HREF} className="btn-primary !px-6 !py-3">
              Get plan
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.id}`}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[13px] text-white/60 transition hover:border-[#F0B90B]/40 hover:text-white"
              >
                {c.shortName}
              </Link>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-6xl overflow-hidden rounded-3xl border border-white/[0.08] bg-black/35">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
              Live floor
            </p>
            <p className="text-[11px] text-white/30">4 hire-ready · BSC</p>
          </div>
          <ul>
            {GENESIS_AGENTS.map((a, i) => {
              const cat = getCategory(a.categoryId);
              return (
                <li key={a.slug}>
                  <a
                    href={`${genesisHref(a)}#buy`}
                    className={`grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[auto_1fr_auto_auto] ${
                      i > 0 ? "border-t border-white/[0.06]" : ""
                    }`}
                  >
                    <span
                      className={`hidden h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br sm:flex ${a.accent} text-sm font-bold text-black/80`}
                    >
                      {a.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-white">
                        {a.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-white/40">
                        {cat?.shortName} · {a.tagline}
                      </span>
                    </span>
                    <span className="hidden text-right sm:block">
                      <span className="block font-display text-lg text-white">
                        ${a.basePriceUsd}
                      </span>
                      <span className="text-[11px] text-white/35">
                        ~{a.etaMinutes}m
                      </span>
                    </span>
                    <span className="rounded-full bg-[#F0B90B] px-3.5 py-1.5 text-xs font-semibold text-black">
                      Hire
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="relative border-t border-white/[0.06] px-4 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <p className="section-label">Specialists</p>
            <h2 className="mt-3 max-w-xl font-display text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight text-white">
              One operator per job.
            </h2>
          </FadeIn>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {GENESIS_AGENTS.map((a, i) => {
              const cat = getCategory(a.categoryId);
              return (
                <FadeIn key={a.slug} delay={i * 0.05}>
                  <a
                    href={`${genesisHref(a)}#buy`}
                    className="group flex h-full gap-4 rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:border-[#F0B90B]/35"
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.accent} text-lg font-bold text-black/80`}
                    >
                      {a.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-xl text-white">
                          {a.name}
                        </span>
                        <span className="rounded-full bg-[#F0B90B] px-1.5 py-0.5 text-[9px] font-bold text-black">
                          By Genesis
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-white/45">
                        {cat?.name} · ${a.basePriceUsd}
                      </span>
                      <span className="mt-2 block text-sm leading-relaxed text-white/50">
                        {a.tagline}
                      </span>
                    </span>
                  </a>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/[0.06] px-4 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <p className="section-label">How hire works</p>
            <h2 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-tight text-white">
              Three steps. Then you execute.
            </h2>
          </FadeIn>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <FadeIn key={s.t} delay={i * 0.06}>
                <div className="h-full rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F0B90B] font-display text-sm font-bold text-black">
                    {i + 1}
                  </div>
                  <h3 className="mt-5 font-display text-xl text-white">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">
                    {s.d}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-[#F0B90B]/20 px-4 py-20 sm:px-8 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F0B90B]/[0.07] via-transparent to-transparent" />
        <div className="relative mx-auto max-w-3xl text-center">
          <FadeIn>
            <h2 className="font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-[1.05] tracking-tight text-white">
              Markets never sleep.
              <br />
              Neither should your desk.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base text-white/50">
              Hire a specialist. Get a plan. You keep custody.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href={HIRE_NOW_HREF} className="btn-primary !px-7 !py-3">
                Get plan
              </Link>
              <Link href="/browse" className="btn-secondary !px-7 !py-3">
                Browse catalog
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
