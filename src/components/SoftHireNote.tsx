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
          ? "Soft hire · plan only · you keep the keys · optional mainnet escrow on /fund"
          : "Plan only. You keep the keys. Soft hire is free — the agent does not move funds."}
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
          keys. Optional on-chain escrow is BSC mainnet ERC-8183. Hire is not
          an Altana session.
        </>
      ) : (
        <>
          Plan only. You keep the keys. Soft hire is free — the agent does
          not move funds. Optional on-chain lock is BSC mainnet ERC-8183.
          Create an account so the plan follows you.
        </>
      )}
    </div>
  );
}
