import Link from "next/link";

type Props = {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  animated?: boolean;
  className?: string;
};

const box = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
} as const;

/**
 * Genesis mark: specialist agent holding a marketplace bag (hire / commerce).
 * Optional soft CSS animation — no scroll JS.
 */
export function GenesisMark({
  href = "/",
  size = "md",
  showWordmark = true,
  animated = true,
  className = "",
}: Props) {
  const mark = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`relative ${box[size]} shrink-0 ${animated ? "genesis-mark-float" : ""}`}
        aria-hidden
      >
        <svg
          viewBox="0 0 48 48"
          className="h-full w-full drop-shadow-[0_2px_8px_rgba(240,185,11,0.25)]"
          fill="none"
        >
          <defs>
            <linearGradient id="gm-amber" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F5C842" />
              <stop offset="1" stopColor="#C99400" />
            </linearGradient>
            <linearGradient id="gm-body" x1="12" y1="10" x2="28" y2="36" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2A3548" />
              <stop offset="1" stopColor="#121820" />
            </linearGradient>
          </defs>

          {/* Soft plate */}
          <rect
            x="2"
            y="2"
            width="44"
            height="44"
            rx="12"
            fill="#0c121c"
            stroke="url(#gm-amber)"
            strokeWidth="1.5"
          />

          {/* Agent head */}
          <rect
            x="11"
            y="9"
            width="16"
            height="13"
            rx="4"
            fill="url(#gm-body)"
            stroke="#F0B90B"
            strokeWidth="1.2"
          />
          {/* Eyes */}
          <circle cx="16" cy="15" r="1.6" fill="#F0B90B" className={animated ? "genesis-mark-eye" : undefined} />
          <circle cx="22" cy="15" r="1.6" fill="#F0B90B" className={animated ? "genesis-mark-eye" : undefined} />
          {/* Antenna */}
          <line x1="19" y1="9" x2="19" y2="6" stroke="#F0B90B" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="19" cy="5" r="1.5" fill="#F0B90B" className={animated ? "genesis-mark-pulse" : undefined} />

          {/* Agent body */}
          <rect
            x="12"
            y="22"
            width="14"
            height="12"
            rx="3.5"
            fill="url(#gm-body)"
            stroke="#F0B90B"
            strokeWidth="1.2"
          />
          {/* Core */}
          <circle cx="19" cy="28" r="2.4" fill="#F0B90B" opacity="0.9" />

          {/* Shopping bag (marketplace) — right side */}
          <g className={animated ? "genesis-mark-bag" : undefined}>
            {/* Handle */}
            <path
              d="M30 20c0-2.2 1.6-4 3.5-4s3.5 1.8 3.5 4"
              stroke="#F0B90B"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Bag body */}
            <path
              d="M28.5 20h10l-1 14.5c0 1.4-1.1 2.5-2.5 2.5h-3c-1.4 0-2.5-1.1-2.5-2.5L28.5 20z"
              fill="url(#gm-amber)"
              stroke="#C99400"
              strokeWidth="0.6"
            />
            {/* Bag fold */}
            <path d="M30 24.5h7" stroke="#0a0a0a" strokeOpacity="0.25" strokeWidth="1" strokeLinecap="round" />
            {/* G stamp on bag */}
            <text
              x="33.5"
              y="32.5"
              textAnchor="middle"
              fill="#0a0a0a"
              fontSize="6"
              fontWeight="700"
              fontFamily="system-ui,sans-serif"
            >
              G
            </text>
          </g>
        </svg>
      </span>

      {showWordmark && (
        <span className="min-w-0 leading-tight">
          <span className="block font-display text-[0.95rem] font-bold tracking-tight text-white">
            Genesis
          </span>
          <span className="hidden text-[10px] font-medium tracking-tight text-white/40 sm:block">
            Hire DeFi agents
          </span>
        </span>
      )}
    </span>
  );

  if (href === null || href === undefined) return mark;
  return (
    <Link href={href} className="group transition-opacity hover:opacity-95">
      {mark}
    </Link>
  );
}
