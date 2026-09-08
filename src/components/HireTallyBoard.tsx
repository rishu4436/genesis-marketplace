import Link from "next/link";
import type { HireTally } from "@/lib/hire-tally-types";
import { CATEGORIES } from "@/lib/categories";

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function HireTallyBoard({
  tally,
  compact = false,
}: {
  tally: HireTally;
  compact?: boolean;
}) {
  const cells = [
    {
      href: "/hire",
      value: formatCount(tally.hireable),
      label: "Hireable",
      hint: `${tally.genesis} By Genesis · ${tally.liveThirdParty} live A2A we probed`,
      tone: "hire" as const,
    },
    {
      href: "/browse",
      value: formatCount(tally.aliveNotHireable),
      label: "Alive, not hireable",
      hint: "URL answered HTTP 200. No hire we can complete.",
      tone: "alive" as const,
    },
    {
      href: "/browse?index=1",
      value: formatCount(tally.unhireableRegistered),
      label: "Registered, not hireable",
      hint: `${formatCount(tally.registered)} ERC-8004 names on BSC. Identity only.`,
      tone: "index" as const,
    },
  ];

  return (
    <section
      className={
        compact
          ? "rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4"
          : "rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-5"
      }
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
        Hire floor
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-white/70">
        <span className="font-semibold text-amber-100">
          {formatCount(tally.hireable)} hireable
        </span>
        {" · "}
        <span className="text-white/55">
          {formatCount(tally.unhireableRegistered)} not hireable
        </span>
        . Alive is not a hire. Registered is not a hire.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {cells.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={
              c.tone === "hire"
                ? "rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-3 py-3 transition hover:border-amber-400/50"
                : c.tone === "alive"
                  ? "rounded-xl border border-lime-400/15 bg-lime-400/[0.04] px-3 py-3 transition hover:border-lime-400/35"
                  : "rounded-xl border border-rose-400/15 bg-rose-400/[0.04] px-3 py-3 transition hover:border-rose-400/35"
            }
          >
            <p
              className={
                c.tone === "hire"
                  ? "font-display text-2xl font-bold tracking-tight text-amber-100 sm:text-3xl"
                  : c.tone === "alive"
                    ? "font-display text-2xl font-bold tracking-tight text-lime-100/90 sm:text-3xl"
                    : "font-display text-2xl font-bold tracking-tight text-rose-100/80 sm:text-3xl"
              }
            >
              {c.value}
            </p>
            <p
              className={
                c.tone === "hire"
                  ? "mt-1 text-[11px] font-semibold uppercase tracking-wider text-amber-200/80"
                  : c.tone === "alive"
                    ? "mt-1 text-[11px] font-semibold uppercase tracking-wider text-lime-200/70"
                    : "mt-1 text-[11px] font-semibold uppercase tracking-wider text-rose-200/70"
              }
            >
              {c.label}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-white/45">
              {c.hint}
            </p>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-white/40">
        Four jobs
        {CATEGORIES.map((cat) => (
          <span key={cat.id}>
            {" · "}
            <Link
              href={`/categories/${cat.id}`}
              className="text-white/60 hover:text-amber-200"
            >
              {cat.shortName} {tally.byCategory[cat.id]}
            </Link>
          </span>
        ))}
        {tally.asOf ? (
          <span className="text-white/30">
            {" · "}
            probed {new Date(tally.asOf).toISOString().slice(0, 10)}
          </span>
        ) : null}
      </p>
    </section>
  );
}
