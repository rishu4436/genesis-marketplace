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

export function getInjectedEth(): EthProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { ethereum?: EthProvider };
  return w.ethereum ?? null;
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

export async function connectInjectedWallet(): Promise<string> {
  const eth = getInjectedEth();
  if (!eth) {
    throw new Error("Open a browser wallet to pay.");
  }
  const accs = (await eth.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accs?.[0]) throw new Error("No account returned from wallet");
  await switchToBsc(eth);
  return accs[0];
}

export async function sendBnbHire(opts: {
  from: string;
  to: string;
  wei: string;
}): Promise<string> {
  const eth = getInjectedEth();
  if (!eth) throw new Error("Wallet not available");
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
