/**
 * Wallet connect + personal_sign for account login.
 * Not a checkout path — hire is L0 plan-only.
 */

export type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type DiscoveredWallet = {
  uuid: string;
  name: string;
  icon?: string;
  provider: EthProvider;
};

type AnnounceDetail = {
  info?: { uuid?: string; name?: string; icon?: string; rdns?: string };
  provider?: EthProvider;
};

export function getInjectedEth(): EthProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { ethereum?: EthProvider };
  return w.ethereum ?? null;
}

/** EIP-6963: every installed wallet announces itself. We do not pick a brand. */
export function discoverWallets(): Promise<DiscoveredWallet[]> {
  if (typeof window === "undefined") return Promise.resolve([]);
  return new Promise((resolve) => {
    const found = new Map<string, DiscoveredWallet>();
    const onAnnounce = (ev: Event) => {
      const detail = (ev as CustomEvent<AnnounceDetail>).detail;
      const info = detail?.info;
      const provider = detail?.provider;
      if (!info?.uuid || !provider) return;
      found.set(info.uuid, {
        uuid: info.uuid,
        name: info.name || "Wallet",
        icon: info.icon,
        provider,
      });
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      if (found.size === 0) {
        const legacy = getInjectedEth();
        if (legacy) {
          found.set("browser", {
            uuid: "browser",
            name: "Browser wallet",
            provider: legacy,
          });
        }
      }
      resolve([...found.values()].sort((a, b) => a.name.localeCompare(b.name)));
    }, 120);
  });
}

export async function requestAccounts(eth: EthProvider): Promise<string> {
  const accs = (await eth.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accs?.[0]) throw new Error("No account returned from wallet");
  return accs[0];
}

export async function signLoginMessage(
  eth: EthProvider,
  address: string,
  message: string,
): Promise<string> {
  const sig = (await eth.request({
    method: "personal_sign",
    params: [message, address],
  })) as string;
  if (!sig) throw new Error("Wallet did not return a signature");
  return sig;
}
