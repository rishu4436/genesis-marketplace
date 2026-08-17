import type { CategoryId } from "@/lib/categories";

type Props = {
  id: CategoryId;
  className?: string;
  /** sm = 32px, md = 40px, lg = 48px */
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

const shell: Record<
  CategoryId,
  { bg: string; ring: string; ink: string }
> = {
  rebalancing: {
    bg: "from-amber-400/20 to-orange-500/10",
    ring: "ring-amber-400/30",
    ink: "text-amber-300",
  },
  "grid-trading": {
    bg: "from-sky-400/20 to-blue-600/10",
    ring: "ring-sky-400/30",
    ink: "text-sky-300",
  },
  "yield-optimisation": {
    bg: "from-emerald-400/20 to-teal-600/10",
    ring: "ring-emerald-400/30",
    ink: "text-emerald-300",
  },
  "health-factor": {
    bg: "from-rose-400/20 to-red-600/10",
    ring: "ring-rose-400/30",
    ink: "text-rose-300",
  },
};

/** Unique SVG mark per job category (not generic unicode). */
export function CategoryIcon({ id, className = "", size = "md" }: Props) {
  const s = shell[id];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.bg} ring-1 ${s.ring} ${sizeMap[size]} ${s.ink} ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[55%] w-[55%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {id === "rebalancing" && (
          <>
            {/* LP range band + rebalance arrows */}
            <rect x="3.5" y="8" width="17" height="8" rx="2" opacity="0.35" />
            <path d="M7 12h10" />
            <path d="M9 9.5 7 12l2 2.5" />
            <path d="M15 9.5l2 2.5-2 2.5" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          </>
        )}
        {id === "grid-trading" && (
          <>
            {/* Grid lattice = levels */}
            <path d="M4 4h16v16H4z" opacity="0.35" />
            <path d="M4 9h16M4 14h16M9 4v16M14 4v16" />
            <circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="14" cy="14" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="9" cy="14" r="1.1" fill="currentColor" stroke="none" />
            <circle cx="14" cy="9" r="1.1" fill="currentColor" stroke="none" />
          </>
        )}
        {id === "yield-optimisation" && (
          <>
            {/* Rising yield bars + arrow */}
            <path d="M5 18V12" />
            <path d="M10 18V9" />
            <path d="M15 18V7" />
            <path d="M20 18V5" opacity="0.45" />
            <path d="M4 19h16" opacity="0.4" />
            <path d="M6 8.5c3-1 5.5 1 8.5-1.5L17 5" />
            <path d="M14.5 5H17v2.5" />
          </>
        )}
        {id === "health-factor" && (
          <>
            {/* Shield + pulse */}
            <path d="M12 3.5 19 6.5v5c0 4.2-2.9 7.5-7 8.5-4.1-1-7-4.3-7-8.5v-5L12 3.5z" />
            <path d="M8.5 12h2l1.2-2.5 1.6 5 1.2-2.5H15.5" />
          </>
        )}
      </svg>
    </span>
  );
}
