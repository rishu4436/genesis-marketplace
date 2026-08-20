/** Honest money line — buyer copy by default; ops copy on /fund and /judge. */
export function SoftHireNote({
  compact = false,
  className = "",
  tone = "buyer",
}: {
  compact?: boolean;
  className?: string;
  tone?: "buyer" | "ops";
}) {
  if (compact) {
    return (
      <p className={`text-[12px] leading-relaxed text-white/40 ${className}`}>
        {tone === "ops"
          ? "Soft hire · plan only · you keep the keys · escrow blocked (PolicyNotWhitelisted)"
          : "Plan only · you keep the keys · the agent does not move funds"}
      </p>
    );
  }

  return (
    <div
      className={`rounded-[10px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13.5px] leading-relaxed text-white/50 ${className}`}
    >
      {tone === "ops" ? (
        <>
          You get a structured plan. The agent does not move funds or hold
          keys. On-chain escrow is blocked (testnet PolicyNotWhitelisted) — we
          do not fake a lock. Hire is not an Altana session.
        </>
      ) : (
        <>
          Plan only. You keep the keys. The agent does not move funds or hold
          them. Create an account so the plan follows you.
        </>
      )}
    </div>
  );
}
