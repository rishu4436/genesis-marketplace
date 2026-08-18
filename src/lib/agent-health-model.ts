/**
 * Health classification — pure. A 200 on /health is not "Live".
 *
 * live     = identity + runtime version + platform actually reachable
 * local    = identity + runtime version (hire path ready, platform may be dead)
 * degraded = runtime up but version/identity/mandate drifted
 * unknown  = cannot confirm runtime (hire may still work in-process)
 */

export type LiveStatus = "live" | "local" | "degraded" | "unknown";

export type HealthCheckId =
  | "identity"
  | "runtime"
  | "version"
  | "mandate"
  | "evidence"
  | "platform";

export type HealthCheck = {
  ok: boolean;
  detail: string;
};

export type HealthChecks = Record<HealthCheckId, HealthCheck>;

export type ClassifiedHealth = {
  status: LiveStatus;
  label: string;
  detail: string;
};

export function classifyHealth(checks: HealthChecks): ClassifiedHealth {
  const bound =
    checks.identity.ok &&
    checks.runtime.ok &&
    checks.version.ok &&
    checks.mandate.ok;

  if (bound && checks.platform.ok) {
    return {
      status: "live",
      label: "Live",
      detail: "ERC-8004 + pinned version + platform runtime reachable",
    };
  }

  if (bound) {
    return {
      status: "local",
      label: "Ready",
      detail: checks.evidence.ok
        ? "Identity + version bound · hire path ready · recent receipt"
        : "Identity + version bound · hire path ready",
    };
  }

  if (checks.runtime.ok && (!checks.version.ok || !checks.mandate.ok)) {
    return {
      status: "degraded",
      label: "Drift",
      detail: !checks.version.ok
        ? checks.version.detail
        : checks.mandate.detail,
    };
  }

  if (checks.identity.ok && !checks.runtime.ok) {
    return {
      status: "unknown",
      label: "Identity",
      detail: "ERC-8004 pinned · runtime did not confirm this version",
    };
  }

  return {
    status: "unknown",
    label: "Unknown",
    detail: "Could not confirm identity or runtime",
  };
}

export function healthStyle(status: LiveStatus): string {
  switch (status) {
    case "live":
      return "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30";
    case "local":
      return "bg-sky-400/15 text-sky-300 ring-sky-400/30";
    case "degraded":
      return "bg-amber-400/15 text-amber-200 ring-amber-400/30";
    default:
      return "bg-white/10 text-white/50 ring-white/15";
  }
}
