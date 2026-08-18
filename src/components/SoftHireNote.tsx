/** Honest money line — soft hire, no custody, escrow not live. */
export function SoftHireNote({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <p className={`text-[12px] leading-relaxed text-white/40 ${className}`}>
        Soft hire · plan only · you keep the keys · escrow blocked
        (PolicyNotWhitelisted) · hire is not an Altana spend key
      </p>
    );
  }

  return (
    <div
      className={`rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13.5px] leading-relaxed text-white/50 ${className}`}
    >
      You get a structured plan. The agent does not move funds or hold keys.
      On-chain escrow is blocked (testnet PolicyNotWhitelisted) — we do not
      fake a lock. Hire is not an Altana session; Altana is an optional
      spend-cap grant on /altana.
    </div>
  );
}
