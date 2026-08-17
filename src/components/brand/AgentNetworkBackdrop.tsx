/**
 * Quiet marketplace network motif — lower contrast for Arcus-like calm dark UI.
 */
export function AgentNetworkBackdrop({
  intensity = "app",
}: {
  intensity?: "landing" | "app";
}) {
  const isLanding = intensity === "landing";

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#05060a]" />
      <div
        className="absolute inset-0"
        style={{
          background: isLanding
            ? "radial-gradient(ellipse 90% 55% at 50% -15%, rgba(240,185,11,0.09), transparent 55%), radial-gradient(ellipse 45% 35% at 90% 70%, rgba(80,100,140,0.08), transparent 55%)"
            : "radial-gradient(ellipse 80% 45% at 50% -10%, rgba(240,185,11,0.05), transparent 50%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          opacity: isLanding ? 0.14 : 0.08,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: isLanding ? 0.38 : 0.18 }}
      >
        <defs>
          <linearGradient id="edgeAmber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F0B90B" stopOpacity="0" />
            <stop offset="45%" stopColor="#F0B90B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F0B90B" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="edgeSoft" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9AA8C0" stopOpacity="0.04" />
            <stop offset="50%" stopColor="#9AA8C0" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#9AA8C0" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <g stroke="url(#edgeSoft)" strokeWidth="1" fill="none">
          <path d="M180 160 C 320 120, 400 200, 520 180" />
          <path d="M520 180 C 640 160, 720 220, 880 200" />
          <path d="M200 420 C 340 380, 420 480, 560 440" />
          <path d="M560 440 C 700 400, 780 500, 960 460" />
          <path d="M160 620 C 300 580, 480 640, 640 600" />
          <path d="M640 600 C 800 560, 900 640, 1040 580" />
          <path d="M320 200 C 360 300, 380 360, 400 480" />
          <path d="M700 220 C 740 300, 760 380, 780 500" />
        </g>
        <g stroke="url(#edgeAmber)" strokeWidth="1.1" fill="none">
          <path d="M100 300 C 280 260, 450 320, 620 280" />
          <path d="M250 100 C 400 180, 500 240, 700 300" />
          <path d="M400 700 C 550 620, 700 580, 900 520" />
        </g>

        {(
          [
            [180, 160],
            [520, 180],
            [880, 200],
            [200, 420],
            [560, 440],
            [960, 460],
            [160, 620],
            [640, 600],
            [1040, 580],
            [400, 300],
            [750, 350],
            [820, 120],
          ] as const
        ).map(([x, y]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            <circle r="12" fill="none" stroke="#F0B90B" strokeOpacity="0.28" strokeWidth="1" />
            <circle r="4.5" fill="#F0B90B" fillOpacity="0.75" />
          </g>
        ))}

        <g transform="translate(420 400)">
          <circle r="32" fill="none" stroke="#F0B90B" strokeOpacity="0.16" strokeWidth="1" />
          <circle r="6" fill="#F0B90B" fillOpacity="0.7" />
        </g>
      </svg>

    </div>
  );
}
