import type { Agent } from "@/lib/types";
import {
  AgentListingPanel,
  featuresFromAgent,
  isAgentRegistered,
  type ListingFeature,
} from "@/components/AgentListingPanel";
import { shortAddress } from "@/lib/scan";

type Props = {
  agent?: Agent | null;
  /** Genesis / specialist override */
  registered?: boolean;
  registrationDetail?: string;
  features?: ListingFeature[];
  skills?: string[];
  liveLabel?: string;
  samplePreview?: { title: string; body: string };
};

/**
 * Trust passport: registration, listed features, optional sample preview.
 */
export function TrustPassport({
  agent,
  registered,
  registrationDetail,
  features,
  skills,
  liveLabel,
  samplePreview,
}: Props) {
  const reg =
    registered ?? (agent ? isAgentRegistered(agent) : false);
  const feats = features ?? (agent ? featuresFromAgent(agent) : []);
  const detail =
    registrationDetail ??
    (agent
      ? reg
        ? `ERC-8004 identity${
            agent.owner_address
              ? ` · owner ${shortAddress(agent.owner_address, 4)}`
              : ""
          }${liveLabel ? ` · ${liveLabel}` : ""}.`
        : "No registration signals in the partner index."
      : liveLabel || "");

  return (
    <div className="space-y-6">
      <AgentListingPanel
        registered={reg}
        registrationDetail={detail}
        features={feats}
        skills={skills}
        title="Trust passport"
      />
      {samplePreview && (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
          <p className="section-label">Sample deliverable</p>
          <h3 className="mt-1 text-sm font-semibold text-white">
            {samplePreview.title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            {samplePreview.body}
          </p>
          <p className="mt-3 text-[10px] text-white/35">
            Preview of style only — your buy returns a fresh plan for your brief.
          </p>
        </section>
      )}
    </div>
  );
}
