/**
 * Session policy templates per Genesis specialist.
 * Call allowlists + spend caps for Altana sessions (BSC).
 * Addresses: mainnet defaults; testnet may share or use broader demo allowlist.
 */

export type CallPermission = {
  to?: `0x${string}`;
  signature?: string;
};

export type SpendPermission = {
  limit: string; // decimal string for JSON (bigint as string)
  period: "hour" | "day" | "week" | "month" | "year";
  token?: `0x${string}`; // omit = native BNB
  label: string;
};

export type AgentPolicyTemplate = {
  agentSlug: string;
  title: string;
  description: string;
  /** Human-readable permissions */
  bullets: string[];
  defaultExpiryHours: number;
  /** Suggested native spend cap in BNB (demo) */
  nativeSpendBnb: string;
  calls: CallPermission[];
  /** ERC-20 spend suggestions (18 decimals on BSC) */
  tokenSpends: SpendPermission[];
};

/** Well-known BSC mainnet (56) — used as allowlist targets */
export const BSC_CONTRACTS = {
  // PancakeSwap V3
  pcsV3SwapRouter: "0x1b81D678ffb9C0263b24A97847620C99d213eB14" as `0x${string}`,
  pcsV3Npm: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364" as `0x${string}`,
  pcsV2Router: "0x10ED43C718714eb63d5aA57B78B54704E256024E" as `0x${string}`,
  // Venus (approximate / common entry points)
  venusComptroller: "0xfD36E2c2a6789Db23113685031d7F16329158384" as `0x${string}`,
  venusUnitroller: "0xfD36E2c2a6789Db23113685031d7F16329158384" as `0x${string}`,
  // Stable
  usdt: "0x55d398326f99059fF775485246999027B3197955" as `0x${string}`,
  // U token (commerce)
  uToken: "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565" as `0x${string}`,
};

export const SPECIALIST_POLICIES: Record<string, AgentPolicyTemplate> = {
  "range-keeper": {
    agentSlug: "range-keeper",
    title: "RangeKeeper · LP rebalance session",
    description:
      "Scoped authority for PCS V3 position management only — router + position manager, capped USDT/BNB spend.",
    bullets: [
      "Call allowlist: PancakeSwap V3 router + NonfungiblePositionManager",
      "Spend cap: demo USDT/day + small native BNB for gas",
      "Expiry: default 24h (revocable anytime)",
      "No unrestricted calls — Keystore-verifiable",
    ],
    defaultExpiryHours: 24,
    nativeSpendBnb: "0.02",
    calls: [
      { to: BSC_CONTRACTS.pcsV3SwapRouter },
      { to: BSC_CONTRACTS.pcsV3Npm },
    ],
    tokenSpends: [
      {
        limit: (BigInt(50) * BigInt(10) ** BigInt(18)).toString(),
        period: "day",
        token: BSC_CONTRACTS.usdt,
        label: "50 USDT / day",
      },
    ],
  },
  gridwright: {
    agentSlug: "gridwright",
    title: "Gridwright · grid trading session",
    description:
      "Swap router only for grid fills — capped daily spend, short expiry recommended.",
    bullets: [
      "Call allowlist: PCS V2/V3 routers",
      "Spend cap: 25 USDT/day + gas BNB",
      "Expiry: 12h default",
    ],
    defaultExpiryHours: 12,
    nativeSpendBnb: "0.015",
    calls: [
      { to: BSC_CONTRACTS.pcsV2Router },
      { to: BSC_CONTRACTS.pcsV3SwapRouter },
    ],
    tokenSpends: [
      {
        limit: (BigInt(25) * BigInt(10) ** BigInt(18)).toString(),
        period: "day",
        token: BSC_CONTRACTS.usdt,
        label: "25 USDT / day",
      },
    ],
  },
  "yield-router": {
    agentSlug: "yield-router",
    title: "YieldRouter · reallocation session",
    description:
      "Lending + farm routers under a higher stable cap for reallocation plans you approve.",
    bullets: [
      "Call allowlist: Venus comptroller + PCS routers",
      "Spend cap: 100 USDT/day",
      "Expiry: 24h",
    ],
    defaultExpiryHours: 24,
    nativeSpendBnb: "0.02",
    calls: [
      { to: BSC_CONTRACTS.venusComptroller },
      { to: BSC_CONTRACTS.pcsV2Router },
      { to: BSC_CONTRACTS.pcsV3SwapRouter },
    ],
    tokenSpends: [
      {
        limit: (BigInt(100) * BigInt(10) ** BigInt(18)).toString(),
        period: "day",
        token: BSC_CONTRACTS.usdt,
        label: "100 USDT / day",
      },
    ],
  },
  "health-sentinel": {
    agentSlug: "health-sentinel",
    title: "HealthSentinel · protect session",
    description:
      "Repay / collateral paths on Venus only — tight spend for emergency delever.",
    bullets: [
      "Call allowlist: Venus comptroller",
      "Spend cap: 75 USDT/day for repay",
      "Expiry: 48h (alerts may need window)",
    ],
    defaultExpiryHours: 48,
    nativeSpendBnb: "0.02",
    calls: [{ to: BSC_CONTRACTS.venusComptroller }],
    tokenSpends: [
      {
        limit: (BigInt(75) * BigInt(10) ** BigInt(18)).toString(),
        period: "day",
        token: BSC_CONTRACTS.usdt,
        label: "75 USDT / day",
      },
    ],
  },
};

export function getPolicy(slug: string): AgentPolicyTemplate | null {
  return SPECIALIST_POLICIES[slug] || null;
}

export function allPolicies(): AgentPolicyTemplate[] {
  return Object.values(SPECIALIST_POLICIES);
}
