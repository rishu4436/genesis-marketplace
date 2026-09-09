/**
 * Commerce rails / tiers — free scan, full plan, optional escrow.
 */

import {
  marketplaceTiers,
  type CommerceTier,
  type TierSpec,
} from "./agent-model";

export type CommerceRail = CommerceTier;

export type CommerceMode = {
  rail: CommerceRail;
  label: string;
  short: string;
  description: string;
  available: boolean;
  reason?: string;
};

export function commerceModesForAgent(opts: {
  x402?: boolean;
  hireReady?: boolean;
  escrowAvailable?: boolean;
}): CommerceMode[] {
  return marketplaceTiers({
    x402: opts.x402,
    escrowAvailable: opts.escrowAvailable,
  }).map((t: TierSpec) => ({
    rail: t.id,
    label: t.label,
    short: t.short,
    description: `${t.costLabel} · ${t.speed} · ${t.settlement}`,
    available: t.available,
    reason: t.reason,
  }));
}

export function defaultRail(modes: CommerceMode[]): CommerceRail {
  const full = modes.find((m) => m.rail === "full" && m.available);
  if (full) return "full";
  const first = modes.find((m) => m.available);
  return first?.rail || "full";
}
