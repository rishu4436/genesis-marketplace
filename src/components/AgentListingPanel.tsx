import type { Agent } from "@/lib/types";

export type ListingFeature = {
  label: string;
  detail?: string;
  active: boolean;
};

type Props = {
  /** On-chain / index registration present */
  registered: boolean;
  registrationDetail?: string;
  features: ListingFeature[];
  /** Optional skills / capabilities listed by the seller */
  skills?: string[];
  title?: string;
};

/**
 * Clear registration + listed-feature strip for agent detail pages.
 */
export function AgentListingPanel({
  registered,
  registrationDetail,
  features,
  skills,
  title = "Registration & features",
}: Props) {
  const active = features.filter((f) => f.active);
  const inactive = features.filter((f) => !f.active);

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Agent listing</p>
          <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-white">
            {title}
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
            registered
              ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
              : "bg-white/8 text-white/45 ring-white/15"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              registered ? "bg-emerald-400" : "bg-white/30"
            }`}
          />
          {registered ? "Registered" : "Not registered"}
        </span>
      </div>

      {registrationDetail && (
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          {registrationDetail}
        </p>
      )}

      <div className="mt-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
          Listed features
        </h3>
        {active.length === 0 && inactive.length === 0 ? (
          <p className="mt-2 text-sm text-white/45">
            No features listed for this agent.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {active.map((f) => (
              <li
                key={f.label}
                className="flex items-start gap-2.5 rounded-xl border border-emerald-400/20 bg-emerald-400/8 px-3 py-2.5"
              >
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-400/25 text-[10px] font-bold text-emerald-300"
                  aria-hidden
                >
                  ✓
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-emerald-50">
                    {f.label}
                  </div>
                  {f.detail && (
                    <div className="mt-0.5 text-[11px] leading-snug text-white/50">
                      {f.detail}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {inactive.map((f) => (
              <li
                key={f.label}
                className="flex items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 opacity-70"
              >
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/35"
                  aria-hidden
                >
                  –
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white/45">
                    {f.label}
                  </div>
                  {f.detail && (
                    <div className="mt-0.5 text-[11px] leading-snug text-white/30">
                      {f.detail}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {skills && skills.length > 0 && (
        <div className="mt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
            Skills
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {skills.map((s) => (
              <li
                key={s}
                className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-100"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Build listing features from an 8004scan / catalog agent */
export function featuresFromAgent(agent: Agent): ListingFeature[] {
  const protocols = agent.supported_protocols?.filter(Boolean) ?? [];
  return [
    {
      label: "ERC-8004 identity",
      detail: agent.agent_id
        ? `ID ${agent.agent_id}`
        : `Token #${agent.token_id}`,
      active: Boolean(agent.agent_id || agent.token_id),
    },
    {
      label: "Verified",
      detail: agent.is_verified
        ? "Marked verified in partner index"
        : "Not verified — inspect owner & feedback",
      active: Boolean(agent.is_verified),
    },
    {
      label: "x402 payments",
      detail: agent.x402_supported
        ? "Payment rail flagged"
        : "Not listed on this agent",
      active: Boolean(agent.x402_supported),
    },
    {
      label: "Protocols",
      detail:
        protocols.length > 0
          ? protocols.join(", ")
          : "None listed in catalog",
      active: protocols.length > 0,
    },
    {
      label: "Feedback",
      detail:
        (agent.total_feedbacks ?? 0) > 0
          ? `${agent.total_feedbacks} signals · avg ${
              agent.average_score != null
                ? agent.average_score.toFixed(1)
                : "—"
            }`
          : "No feedback yet",
      active: (agent.total_feedbacks ?? 0) > 0,
    },
    {
      label: "Mainnet listing",
      detail: agent.is_testnet ? "Testnet identity" : "Mainnet chain",
      active: !agent.is_testnet,
    },
  ];
}

export function isAgentRegistered(agent: Agent): boolean {
  return Boolean(
    agent.agent_id ||
      agent.token_id != null ||
      agent.contract_address ||
      agent.owner_address,
  );
}
