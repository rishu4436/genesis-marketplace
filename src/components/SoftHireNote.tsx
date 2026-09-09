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
          ? "Soft hire · plan only · you keep the keys · optional escrow on BSC mainnet"
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
          keys. Optional on-chain escrow is ERC-8183 on BSC mainnet. Hire is
          not an Altana session.
        </>
      ) : (
        <>
          Plan: free structured plan, you keep the keys, the agent
          does not move funds. Optional hire lock is ERC-8183 on BSC
          mainnet. Create an account so the plan follows you.
        </>
      )}
    </div>
  );
}
