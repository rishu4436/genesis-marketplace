/**
 * Live BSC wallet checkout — real connect + real native BNB transfer.
 */

export const BSC_MAINNET = 56;
export const BSC_HEX = "0x38";

/** Operator treasury — override with NEXT_PUBLIC_TREASURY_ADDRESS */
export const DEFAULT_TREASURY =
  "0xD322D37a6E772ed2c4E32C53f66cd72e20480f80";

export type WalletQuote = {
  usd: number;
  bnbUsd: number;
  bnb: string;
  wei: string;
  weiHex: string;
  to: string;
  chainId: number;
};

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

export function treasuryAddress(): string {
  const fromEnv = process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.trim();
  if (fromEnv && /^0x[a-fA-F0-9]{40}$/.test(fromEnv)) return fromEnv;
  return DEFAULT_TREASURY;
}

export function toWeiHex(weiDec: string): string {
  const n = BigInt(weiDec);
  return `0x${n.toString(16)}`;
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

export async function connectProvider(eth: EthProvider): Promise<string> {
  const accs = (await eth.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accs?.[0]) throw new Error("No account returned from wallet");
  await switchToBsc(eth);
  return accs[0];
}

export async function sendBnbHire(
  opts: { from: string; to: string; wei: string },
  eth: EthProvider,
): Promise<string> {
  await switchToBsc(eth);
  const hash = (await eth.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: opts.from,
        to: opts.to,
        value: toWeiHex(opts.wei),
        chainId: BSC_HEX,
      },
    ],
  })) as string;
  if (!hash) throw new Error("Wallet did not return a transaction hash");
  return hash;
}

export function bscscanTx(hash: string) {
  return `https://bscscan.com/tx/${hash}`;
}
