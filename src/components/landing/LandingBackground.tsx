/**
 * Warm BNB floor — gold wash + faint desk grid.
 */
export function LandingBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-[#05060a]" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(240,185,11,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(240,185,11,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 75% 55% at 50% 20%, black 15%, transparent 70%)",
        }}
      />
      <div
        className="absolute left-[-12%] top-[-18%] h-[640px] w-[640px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(240,185,11,0.16) 0%, transparent 68%)",
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-8%] h-[420px] w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(240,185,11,0.06) 0%, transparent 70%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05060a] to-transparent" />
    </div>
  );
}
