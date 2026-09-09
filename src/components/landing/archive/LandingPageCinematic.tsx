"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import Lenis from "lenis";
import { LandingBackgroundCinematic } from "@/components/landing/archive/LandingBackgroundCinematic";
import { CATEGORIES, getCategory, type CategoryId } from "@/lib/categories";
import { GENESIS_AGENTS, HIRE_NOW_HREF } from "@/lib/genesis-agents";
import { PartnerLiveBadges } from "@/components/PartnerLiveBadges";
import { PARTNERS } from "@/lib/partners";
import type { HireTally } from "@/lib/hire-tally-types";
import type { ReactNode } from "react";

const CATEGORY_META: Record<
  string,
  { metric: string; glow: string; icon: string }
> = {
  rebalancing: {
    metric: "In-range capture",
    glow: "from-amber-400/25 to-orange-500/5",
    icon: "◎",
  },
  "grid-trading": {
    metric: "Fill efficiency",
    glow: "from-sky-400/25 to-cyan-500/5",
    icon: "▦",
  },
  "yield-optimisation": {
    metric: "Risk-adj. APR",
    glow: "from-emerald-400/25 to-teal-500/5",
    icon: "▲",
  },
  "health-factor": {
    metric: "Liquidation distance",
    glow: "from-rose-400/25 to-fuchsia-500/5",
    icon: "✚",
  },
};

const STEPS = [
  {
    n: "01",
    t: "Discover",
    d: "Job SKUs first — rebalance, grid, yield, health factor. Not 200k names.",
  },
  {
    n: "02",
    t: "Compare",
    d: "Receipt score and hire rail before Buy. Featured is labeled, not ranked.",
  },
  {
    n: "03",
    t: "Plan",
    d: "Get plan: one click, structured plan, you keep the keys.",
  },
  {
    n: "04",
    t: "Escrow · prove · rank",
    d: "Optional escrow (ERC-8183). Hashed receipt. Rank follows paid delivery.",
  },
];

const WINS = [
  {
    t: "Job SKUs, not name soup",
    d: "Four DeFi briefs people buy. Rank follows paid delivery — not 200k registrations.",
  },
  {
    t: "Four categories, equal",
    d: "Rebalance, grid, yield, health factor — same hire depth on every shelf.",
  },
  {
    t: "Minimal friction",
    d: "Job-first discovery. One brief. One buy. Shareable results.",
  },
  {
    t: "Built to be canonical",
    d: "Designed as the front door for Agent Studio on BNB Smart Chain.",
  },
];

function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    let raf = 0;
    function loop(time: number) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [enabled]);
}

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function CategoryCard({
  id,
  index,
  hireableCount,
}: {
  id: string;
  index: number;
  hireableCount: number;
}) {
  const cat = CATEGORIES.find((c) => c.id === id)!;
  const meta = CATEGORY_META[id];
  const agent = GENESIS_AGENTS.find((a) => a.categoryId === id);

  return (
    <FadeIn delay={index * 0.08}>
      <Link
        href={`/categories/${id}`}
        className="group relative block h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition duration-300 hover:border-[#F0B90B]/35 hover:bg-white/[0.05] sm:p-7"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${meta.glow} blur-2xl transition group-hover:opacity-100`}
        />
        <div className="relative flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-lg text-[#F0B90B]">
            {meta.icon}
          </span>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-100/80">
            {hireableCount} hireable
          </span>
        </div>
        <h3 className="relative mt-5 font-display text-xl font-bold tracking-tight text-white">
          {cat.name}
        </h3>
        <p className="relative mt-2 text-sm leading-relaxed text-white/50">
          {cat.agentDoes}
        </p>
        {agent && (
          <p className="relative mt-3 text-[11px] text-white/35">
            Specialist · {agent.name} · from ${agent.basePriceUsd}
          </p>
        )}
        <span className="relative mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F0B90B] transition group-hover:gap-2.5">
          Explore
          <span aria-hidden>→</span>
        </span>
      </Link>
    </FadeIn>
  );
}

function Hero({
  scrollYProgress,
  tally,
  tallyBoard,
}: {
  scrollYProgress: MotionValue<number>;
  tally: HireTally;
  tallyBoard: ReactNode;
}) {
  const reduce = useReducedMotion();
  const y = useTransform(scrollYProgress, [0, 0.2], reduce ? [0, 0] : [0, -24]);

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden">
      <motion.div style={{ y }} className="mx-auto w-full max-w-6xl px-5 py-28 sm:px-8 sm:py-32">
        <motion.p
          className="section-label text-[#F0B90B]/70"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          BNB Chain · Build the Era
        </motion.p>
        <motion.h1
          className="mt-6 max-w-4xl font-display text-[clamp(2.75rem,8vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.045em] text-white"
          initial={reduce ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          The agent marketplace
          <br />
          for the{" "}
          <span className="em-accent">Smart Money Era</span>
        </motion.h1>
        <motion.p
          className="mt-8 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.7 }}
        >
          {tally.hireable.toLocaleString("en-US")} hireable on this desk.{" "}
          {tally.unhireableRegistered.toLocaleString("en-US")} registered names
          are not a hire. Pick a job, get a plan — you keep the keys.
        </motion.p>
        <motion.p
          className="mt-5 max-w-xl text-[15px] font-medium leading-snug tracking-tight text-[#F0B90B] sm:text-base"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {tally.hireable.toLocaleString("en-US")} hireable
          {tally.endpointAlive > 0
            ? ` · ${tally.aliveNotHireable.toLocaleString("en-US")} endpoint-alive (not a hire)`
            : ""}
          {" · "}
          {tally.unhireableRegistered.toLocaleString("en-US")} registered
          (not a hire)
        </motion.p>
        <motion.div
          className="mt-10 flex flex-wrap items-center gap-3"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Link href={HIRE_NOW_HREF} className="btn-primary !px-6 !py-3 !text-[0.95rem]">
            Browse
          </Link>
          <Link
            href="/categories"
            className="btn-secondary !px-6 !py-3 !text-[0.95rem]"
          >
            Four jobs
          </Link>
        </motion.div>
        <motion.div
          className="mt-8 flex flex-wrap gap-2"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.id}`}
              className="rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-white/60 transition hover:border-[#F0B90B]/40 hover:text-white"
            >
              {c.shortName}
            </Link>
          ))}
        </motion.div>
        <motion.div
          className="mt-12 max-w-4xl"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.58 }}
        >
          {tallyBoard}
        </motion.div>
        <motion.div
          className="mt-10 flex flex-wrap gap-10 border-t border-white/[0.07] pt-8"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {[
            [String(tally.genesis), "By Genesis specialists"],
            ["4", "jobs"],
            ["1-click", "hire"],
            ["No custody", "you keep keys"],
          ].map(([a, b]) => (
            <div key={b}>
              <div className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {a}
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
                {b}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.2em] text-white/25">
        Scroll to enter
      </div>
    </section>
  );
}

/**
 * Cinematic Genesis landing — spatial, scroll-driven, hackathon-ready.
 */
/** Archived cinematic landing (pre-FinChip-inspired redesign). */
export function LandingPageCinematic({
  tally,
  tallyBoard,
}: {
  tally: HireTally;
  tallyBoard: ReactNode;
}) {
  const reduce = useReducedMotion();
  useLenis(!reduce);
  const rootRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start start", "end end"],
  });

  return (
    <div ref={rootRef} className="relative w-full bg-[#05070A]">
      <LandingBackgroundCinematic />

      <Hero
        scrollYProgress={scrollYProgress}
        tally={tally}
        tallyBoard={tallyBoard}
      />

      {/* PROBLEM */}
      <section className="relative border-t border-white/[0.06] py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeIn>
            <p className="section-label">The problem</p>
            <h2 className="mt-5 max-w-3xl font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-bold leading-[1.08] tracking-tight text-white">
              {tally.hireable.toLocaleString("en-US")} hireable.{" "}
              {tally.unhireableRegistered.toLocaleString("en-US")} not.
              <br />
              <span className="text-white/40">
                {tally.endpointAlive.toLocaleString("en-US")} endpoint-alive is
                still not a hire.
              </span>
            </h2>
          </FadeIn>
          <div className="mt-14 grid gap-3 sm:grid-cols-3">
            {[
              {
                t: "Fragmented discovery",
                d: "Agents live in threads, repos, and indexes — never one coherent shelf.",
              },
              {
                t: "No performance surface",
                d: "Identity without a hire path is noise. Track record must be legible.",
              },
              {
                t: "Hiring is engineering",
                d: "Negotiates, keys, and docs should not block a one-job hire.",
              },
            ].map((c, i) => (
              <FadeIn key={c.t} delay={i * 0.1}>
                <div className="h-full rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 backdrop-blur-sm">
                  <div className="font-mono text-[11px] text-cyan-300/70">
                    0{i + 1}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-white">
                    {c.t}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/45">
                    {c.d}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
          {/* scattered noise visual */}
          <FadeIn delay={0.2}>
            <div className="relative mt-10 h-28 overflow-hidden rounded-2xl border border-dashed border-white/10 bg-black/30">
              <div className="absolute inset-0 flex flex-wrap content-center justify-center gap-2 p-4 opacity-40">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 rounded-lg border border-white/10 bg-white/[0.04]"
                    style={{
                      width: `${48 + (i % 5) * 18}px`,
                      transform: `rotate(${(i % 7) - 3}deg) translateY(${(i % 3) * 4}px)`,
                    }}
                  />
                ))}
              </div>
              <p className="absolute inset-0 flex items-center justify-center text-xs font-medium tracking-wide text-white/50">
                Scattered cards · broken search · signal lost in noise
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="relative border-t border-white/[0.06] py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
            <FadeIn>
              <p className="section-label">The solution</p>
              <h2 className="mt-5 font-display text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.08] tracking-tight text-white">
                Genesis is the front door.
              </h2>
              <p className="mt-6 text-base leading-relaxed text-white/55 sm:text-lg">
                Discover, compare real signals, and hire autonomous agents on
                BNB Smart Chain — ERC-8004 identity, structured deliverables,
                zero-friction path from intent to work.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  `${tally.hireable.toLocaleString("en-US")} hireable first · ${tally.unhireableRegistered.toLocaleString("en-US")} unhireable identities marked, not hidden`,
                  "Four DeFi jobs — a By Genesis specialist on every shelf",
                  "Hire in one flow — plan-first, keys stay yours",
                ].map((line) => (
                  <li
                    key={line}
                    className="flex items-center gap-3 text-sm font-medium text-white/65"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F0B90B] shadow-[0_0_12px_#F0B90B]" />
                    {line}
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="relative overflow-hidden rounded-3xl border border-[#F0B90B]/20 bg-gradient-to-br from-[#F0B90B]/10 via-white/[0.03] to-cyan-500/5 p-8 sm:p-10">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#F0B90B]/15 blur-3xl" />
                <p className="section-label text-[#F0B90B]/80">Thesis</p>
                <p className="mt-6 font-display text-3xl font-bold leading-[1.15] tracking-tight text-white sm:text-4xl">
                  One brief in.
                  <br />
                  <span className="em-accent">Specialist work</span> out.
                </p>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/50">
                  The marketplace for agents that already live on BNB — made
                  legible, comparable, and hireable.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="relative border-t border-white/[0.06] py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeIn>
            <p className="section-label">Capabilities</p>
            <h2 className="mt-5 max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] font-bold tracking-tight text-white">
              Four categories.{" "}
              <span className="text-white/40">A specialist on every shelf.</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm text-white/50">
              {tally.genesis} By Genesis specialists ·{" "}
              {tally.liveThirdParty} live A2A. Unhireable identities stay
              on category pages and Index, marked Unhireable.
            </p>
          </FadeIn>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {CATEGORIES.map((c, i) => (
              <CategoryCard
                key={c.id}
                id={c.id}
                index={i}
                hireableCount={tally.byCategory[c.id as CategoryId] ?? 0}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CATALOG — not a featured promo shelf */}
      <section className="relative border-t border-white/[0.06] py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeIn>
            <p className="section-label">Catalog</p>
            <h2 className="mt-4 font-display text-2xl font-bold text-white sm:text-3xl">
              Browse hireable agents
            </h2>
            <p className="mt-3 max-w-lg text-sm text-white/50">
              Hireable first. Unhireable identities are marked, not featured.
              Not a paid promo shelf.
            </p>
            <Link
              href="/browse"
              className="btn-primary mt-6 inline-flex !px-6 !py-3"
            >
              Browse
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative border-t border-white/[0.06] py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeIn>
            <p className="section-label">How it works</p>
            <h2 className="mt-5 font-display text-[clamp(1.9rem,4vw,3rem)] font-bold tracking-tight text-white">
              From intent to outcome
            </h2>
          </FadeIn>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <FadeIn key={s.n} delay={i * 0.08}>
                <div className="relative h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                  <div className="font-mono text-[11px] font-medium text-cyan-300/75">
                    /{s.n}
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-white">
                    {s.t}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">
                    {s.d}
                  </p>
                  {i < STEPS.length - 1 && (
                    <div className="pointer-events-none absolute -right-2 top-1/2 hidden h-px w-4 bg-gradient-to-r from-[#F0B90B]/40 to-transparent lg:block" />
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* WHY WINS */}
      <section className="relative border-t border-white/[0.06] py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeIn>
            <p className="section-label">Why Genesis</p>
            <h2 className="mt-5 max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] font-bold tracking-tight text-white">
              Built to win the era.
            </h2>
          </FadeIn>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {WINS.map((w, i) => (
              <FadeIn key={w.t} delay={i * 0.08}>
                <div className="flex gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-6">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#F0B90B]/30 bg-[#F0B90B]/10 font-mono text-xs text-[#F0B90B]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">
                      {w.t}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/50">
                      {w.d}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNERS */}
      <section className="relative border-t border-white/[0.06] py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <FadeIn>
            <p className="section-label">Partners</p>
            <h2 className="mt-5 max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] font-bold tracking-tight text-white">
              Wired into hire.{" "}
              <span className="text-white/40">Not a slide deck.</span>
            </h2>
            <p className="mt-4 max-w-lg text-sm text-white/50">
              Catalog, ratings, live ticks, session keys, and advantage proof
              all have a product surface.
            </p>
          </FadeIn>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PARTNERS.map((p, i) => (
              <FadeIn key={p.id} delay={i * 0.05}>
                <Link
                  href={p.href}
                  className="flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:border-[#F0B90B]/35"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {p.track}
                  </p>
                  <h3 className="mt-2 text-sm font-semibold text-white">
                    {p.name}
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-white/50">
                    {p.role}
                  </p>
                  <span className="mt-4 text-xs font-semibold text-[#F0B90B]">
                    Open →
                  </span>
                </Link>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={0.15}>
            <div className="mt-10">
              <PartnerLiveBadges />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative border-t border-[#F0B90B]/20 py-28 sm:py-36">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#F0B90B]/[0.06] via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
          <FadeIn>
            <p className="section-label text-[#F0B90B]/70">Launch</p>
            <h2 className="mt-5 font-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-tight text-white">
              Markets never sleep.
              <br />
              <span className="em-accent">Neither should your agents.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-base text-white/55">
              Enter Genesis. Hire a specialist. Put work in motion — you keep
              custody.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={HIRE_NOW_HREF}
                className="btn-primary !px-8 !py-3.5 !text-base"
              >
                Browse
              </Link>
            </div>
            <p className="mt-10 text-xs font-medium tracking-wide text-white/35">
              Built for BNB Chain · Build the Era Hackathon
            </p>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
