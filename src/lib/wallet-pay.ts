/**
 * Wallet connect + personal_sign for account login.
 * Also used by ERC-8183 escrow checkout (approve/fund/settle) —
 * never a direct transfer to a seller address.
 */

export const BSC_MAINNET = 56;
export const BSC_HEX = "0x38";

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

export async function getChainId(eth: EthProvider): Promise<number> {
  const hex = (await eth.request({ method: "eth_chainId" })) as string;
  return Number.parseInt(hex, 16);
}

export async function switchToBsc(eth: EthProvider): Promise<void> {
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_HEX }],
    });
  } catch (e) {
    const err = e as { code?: number };
    if (err.code !== 4902) throw e;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BSC_HEX,
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: ["https://bsc-dataseed.binance.org"],
          blockExplorerUrls: ["https://bscscan.com"],
        },
      ],
    });
  }
}

export function isUserRejected(e: unknown): boolean {
  const err = e as { code?: number; message?: string };
  return (
    err?.code === 4001 ||
    /user rejected|denied|rejected the request/i.test(err?.message || "")
  );
}

export async function walletCall(
  eth: EthProvider,
  to: string,
  data: string,
): Promise<string> {
  const result = (await eth.request({
    method: "eth_call",
    params: [{ to, data }, "latest"],
  })) as string;
  return result;
}

export async function sendContractTx(
  eth: EthProvider,
  opts: { from: string; to: string; data: string },
): Promise<`0x${string}`> {
  const hash = (await eth.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: opts.from,
        to: opts.to,
        data: opts.data,
        chainId: BSC_HEX,
      },
    ],
  })) as string;
  if (!hash) throw new Error("Wallet did not return a transaction hash");
  return hash as `0x${string}`;
}

export async function waitForReceipt(
  eth: EthProvider,
  hash: string,
  timeoutMs = 90_000,
): Promise<{ status: "0x1" | "0x0"; logs: { topics?: string[]; data?: string }[] }> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rec = (await eth.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    })) as {
      status?: string;
      logs?: { topics?: string[]; data?: string }[];
    } | null;
    if (rec?.status) {
      return {
        status: rec.status === "0x1" ? "0x1" : "0x0",
        logs: rec.logs || [],
      };
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Timed out waiting for the transaction receipt");
}
