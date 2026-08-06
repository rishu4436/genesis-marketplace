/**
 * BNB managed platform free-trial window for Genesis Studio agents.
 * First successful deploy ~2026-08-06T15:28:26Z → +48h.
 */
export const PLATFORM_TRIAL_EXPIRES_AT = "2026-08-08T15:28:26.000Z";

export const PLATFORM_LIVE_AGENTS = [
  {
    slug: "range-keeper",
    name: "RangeKeeper",
    category: "Rebalancing",
    tokenId: "1773",
    agentId: "01KZBTZ2A4NRRY71WF8YV4EXXY",
  },
  {
    slug: "yield-router",
    name: "YieldRouter",
    category: "Yield",
    tokenId: "1774",
    agentId: "01KZBXKNH3VKHHE3YCH1K496A9",
  },
  {
    slug: "health-sentinel",
    name: "HealthSentinel",
    category: "Health factor",
    tokenId: "1775",
    agentId: "01KZBXTNSPVX052KK69RPWJMN8",
  },
] as const;

export const LOCAL_APEX_AGENTS = [
  {
    slug: "gridwright",
    name: "Gridwright",
    category: "Grid trading",
    reason: "Free platform quota max 3 concurrent agents",
  },
] as const;

export function trialStatus(now = new Date()) {
  const expires = new Date(PLATFORM_TRIAL_EXPIRES_AT);
  const ms = expires.getTime() - now.getTime();
  const expired = ms <= 0;
  const hoursLeft = Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
  const minutesLeft = Math.max(0, Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)));
  return {
    expiresAt: PLATFORM_TRIAL_EXPIRES_AT,
    expired,
    hoursLeft,
    minutesLeft,
    label: expired
      ? "Platform trial expired — local APEX hire still works"
      : `Platform trial ~${hoursLeft}h ${minutesLeft}m left`,
  };
}
