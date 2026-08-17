import type { ScoreAxis } from "@/lib/marketplace-score";

type Props = {
  axes: ScoreAxis[];
  /** Overall 0–100 */
  composite?: number;
  size?: number;
  className?: string;
  /** Show axis labels around the chart */
  showLabels?: boolean;
  title?: string;
  /** Stable unique id for SVG gradient (avoid collisions when many charts on page) */
  gradientId?: string;
  /**
   * full — plate + glow (dashboard / detail)
   * compact — bare radar for agent cards in grids
   */
  variant?: "full" | "compact";
};

/**
 * Pentagon (radar) chart for 5 marketplace score axes.
 * Pure SVG — high-contrast gold fill so it reads on dark marketplace UI.
 */
export function ScorePentagon({
  axes,
  composite,
  size = 260,
  className = "",
  showLabels = true,
  title,
  gradientId,
  variant = "full",
}: Props) {
  const n = Math.max(axes.length, 3);
  const cx = size / 2;
  const cy = size / 2;
  const compact = variant === "compact";
  // Leave room for labels outside the rings on full charts
  const r = size * (compact ? 0.38 : 0.32);
  const levels = compact ? [0.33, 0.66, 1] : [0.2, 0.4, 0.6, 0.8, 1];

  const gid =
    gradientId ||
    `pent-${size}-${axes.map((a) => Math.round(a.value)).join("")}-${Math.round(composite ?? 0)}`;

  const angleAt = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const point = (i: number, t: number) => {
    const a = angleAt(i);
    return {
      x: cx + r * t * Math.cos(a),
      y: cy + r * t * Math.sin(a),
    };
  };

  const ringPath = (t: number) =>
    Array.from({ length: n }, (_, i) => {
      const p = point(i, t);
      return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }).join(" ") + " Z";

  const values = axes.map((a) => Math.max(0, Math.min(100, a.value)) / 100);
  while (values.length < n) values.push(0);

  const dataPath =
    values
      .map((t, i) => {
        const tVis = Math.max(t, t > 0 ? 0.06 : 0.04);
        const p = point(i, tVis);
        return `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  const labelR = r + size * 0.14;
  const strokeW = Math.max(1.25, size * 0.008);
  const dotR = Math.max(compact ? 2.2 : 3.5, size * 0.016);

  const chart = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="block overflow-visible"
      role="img"
      aria-label={
        composite != null
          ? `Marketplace rating ${composite}`
          : "Marketplace rating pentagon"
      }
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0B90B" stopOpacity={compact ? 0.55 : 0.65} />
          <stop offset="55%" stopColor="#F0B90B" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#F0B90B" stopOpacity="0.12" />
        </linearGradient>
        {!compact && (
          <filter id={`${gid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {!compact && (
        <circle
          cx={cx}
          cy={cy}
          r={r + size * 0.04}
          fill="rgba(240,185,11,0.04)"
          stroke="rgba(240,185,11,0.18)"
          strokeWidth="1"
        />
      )}

      {levels.map((t) => (
        <path
          key={t}
          d={ringPath(t)}
          fill={t === 1 && !compact ? "rgba(255,255,255,0.02)" : "none"}
          stroke={
            t === 1
              ? "rgba(240,185,11,0.5)"
              : compact
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.16)"
          }
          strokeWidth={t === 1 ? 1.35 : 1}
        />
      ))}

      {Array.from({ length: n }, (_, i) => {
        const p = point(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1"
          />
        );
      })}

      <path
        d={dataPath}
        fill={`url(#${gid})`}
        stroke="#F0B90B"
        strokeWidth={strokeW * (compact ? 1.15 : 1.4)}
        strokeLinejoin="round"
        filter={!compact ? `url(#${gid}-glow)` : undefined}
      />

      {values.map((t, i) => {
        const tVis = Math.max(t, t > 0 ? 0.06 : 0.04);
        const p = point(i, tVis);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={dotR}
            fill="#F0B90B"
            stroke="#05060a"
            strokeWidth={compact ? 1 : 1.5}
          />
        );
      })}

      {composite != null && !compact && (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={size * 0.11}
            fill="rgba(5,6,10,0.92)"
            stroke="rgba(240,185,11,0.55)"
            strokeWidth="1.5"
          />
          <text
            x={cx}
            y={cy - size * 0.012}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#F0B90B"
            fontSize={size * 0.085}
            fontWeight="700"
            fontFamily="var(--font-syne), system-ui, sans-serif"
          >
            {Math.round(composite)}
          </text>
          <text
            x={cx}
            y={cy + size * 0.055}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.45)"
            fontSize={size * 0.032}
            fontWeight="600"
            fontFamily="var(--font-dm-sans), system-ui, sans-serif"
          >
            / 100
          </text>
        </>
      )}

      {/* Compact: small center number only */}
      {composite != null && compact && size >= 72 && (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={size * 0.14}
            fill="rgba(5,6,10,0.88)"
            stroke="rgba(240,185,11,0.4)"
            strokeWidth="1"
          />
          <text
            x={cx}
            y={cy + 0.5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#F0B90B"
            fontSize={size * 0.16}
            fontWeight="700"
            fontFamily="var(--font-syne), system-ui, sans-serif"
          >
            {Math.round(composite)}
          </text>
        </>
      )}

      {showLabels &&
        !compact &&
        axes.map((ax, i) => {
          const a = angleAt(i);
          const lx = cx + labelR * Math.cos(a);
          const ly = cy + labelR * Math.sin(a);
          let anchor: "start" | "middle" | "end" = "middle";
          if (Math.cos(a) > 0.35) anchor = "start";
          if (Math.cos(a) < -0.35) anchor = "end";
          return (
            <text
              key={ax.id}
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.82)"
              fontSize={Math.max(10, size * 0.042)}
              fontWeight="700"
              fontFamily="var(--font-dm-sans), system-ui, sans-serif"
            >
              {ax.short} {Math.round(ax.value)}
            </text>
          );
        })}
    </svg>
  );

  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {title && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/70">
          {title}
        </p>
      )}
      {compact ? (
        chart
      ) : (
        <div
          className="relative rounded-2xl border border-amber-400/25 bg-[#0a0c12] shadow-[0_0_40px_rgba(240,185,11,0.08)]"
          style={{ width: size + 24, height: size + 24, padding: 12 }}
        >
          {chart}
        </div>
      )}
    </div>
  );
}

/** Compact axis breakdown list next to the pentagon */
export function ScoreAxisList({ axes }: { axes: ScoreAxis[] }) {
  return (
    <ul className="space-y-3">
      {axes.map((ax) => (
        <li key={ax.id}>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-white/80">{ax.label}</span>
            <span className="tabular-nums font-bold text-amber-200">
              {Math.round(ax.value)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200"
              style={{ width: `${Math.max(3, Math.min(100, ax.value))}%` }}
            />
          </div>
          <p className="mt-0.5 text-[10px] text-white/35">{ax.source}</p>
        </li>
      ))}
    </ul>
  );
}
