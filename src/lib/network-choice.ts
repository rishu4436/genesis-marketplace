/**
 * Desk escrow is BSC mainnet only (chain 56).
 * Get plan stays off-chain. Specialist identity stays ERC-8004 on 56.
 */

export const NETWORK_STORAGE_KEY = "genesis-network";
export const NETWORK_EVENT = "genesis-network-change";

export type DeskNetwork = "mainnet";

export type DeskRail = {
  network: DeskNetwork;
  chainId: 56;
  kind: "onchain";
  short: string;
  title: string;
  kicker: string;
  hireLabel: string;
  hint: string;
  points: string[];
};

export function isDeskNetwork(value: unknown): value is DeskNetwork {
  return value === "mainnet";
}

export function escrowChainIdFor(_network?: DeskNetwork): 56 {
  return 56;
}

export function deskNetworkLabel(_network?: DeskNetwork): string {
  return deskRail().short;
}

export function deskRail(_network?: DeskNetwork): DeskRail {
  return {
    network: "mainnet",
    chainId: 56,
    kind: "onchain",
    short: "Mainnet",
    title: "On-chain escrow",
    kicker: "BSC · chain 56",
    hireLabel: "Hire with escrow",
    hint: "Optional ERC-8183 on BNB Smart Chain. 7-day dispute window.",
    points: [
      "Get plan stays free and off-chain",
      "Hire locks live $U on BSC mainnet",
      "7-day dispute window after submit",
      "Needs BNB + $U on mainnet",
    ],
  };
}

export function readDeskNetwork(): DeskNetwork {
  return "mainnet";
}

export function writeDeskNetwork(_network?: DeskNetwork): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NETWORK_STORAGE_KEY, "mainnet");
  window.dispatchEvent(
    new CustomEvent(NETWORK_EVENT, { detail: "mainnet" }),
  );
}

/**
 * URL may still carry leftover ?network=testnet from old links.
 * Those coerce to mainnet — the desk does not offer chain 97.
 */
export function networkFromSearch(search: string): DeskNetwork | null {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const network = (q.get("network") || "").trim().toLowerCase();
  const chain = (q.get("chain") || "").trim().toLowerCase();
  if (
    network === "mainnet" ||
    network === "testnet" ||
    network === "demo" ||
    chain === "56" ||
    chain === "97"
  ) {
    return "mainnet";
  }
  return null;
}
