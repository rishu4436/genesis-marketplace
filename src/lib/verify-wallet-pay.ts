import type { DemoPayment } from "./demo-pay";
import { BSC_MAINNET, treasuryAddress } from "./wallet-pay";

const RPC =
  process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";

async function rpc<T>(method: string, params: unknown[]): Promise<T | null> {
  try {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      cache: "no-store",
    });
    const json = (await res.json()) as { result?: T; error?: { message?: string } };
    if (json.error) return null;
    return json.result ?? null;
  } catch {
    return null;
  }
}

type RpcTx = {
  hash?: string;
  from?: string;
  to?: string;
  value?: string;
};

function sameAddr(a?: string, b?: string) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

export async function verifyWalletPayment(
  payment: DemoPayment,
): Promise<{ ok: boolean; error?: string }> {
  if (payment.method !== "wallet") {
    return { ok: false, error: "Not a wallet payment" };
  }
  if (payment.demo) {
    return { ok: false, error: "Wallet pay cannot be a demo" };
  }
  if (!payment.txHash || !payment.walletAddress || !payment.amountWei) {
    return { ok: false, error: "Missing tx hash, wallet, or amount" };
  }
  const wantTo = (payment.payTo || treasuryAddress()).toLowerCase();
  if (wantTo !== treasuryAddress().toLowerCase()) {
    return { ok: false, error: "Payment sent to the wrong address" };
  }

  let tx: RpcTx | null = null;
  for (let i = 0; i < 5; i++) {
    tx = await rpc<RpcTx>("eth_getTransactionByHash", [payment.txHash]);
    if (tx?.hash) break;
    await new Promise((r) => setTimeout(r, 800));
  }
  if (!tx?.hash) {
    return { ok: false, error: "Transaction not found on BSC yet" };
  }
  if (!sameAddr(tx.from, payment.walletAddress)) {
    return { ok: false, error: "Transaction sender does not match wallet" };
  }
  if (!sameAddr(tx.to, wantTo)) {
    return { ok: false, error: "Transaction recipient is not the treasury" };
  }
  const sent = BigInt(tx.value || "0");
  const want = BigInt(payment.amountWei);
  // Allow 10% drift vs quote
  if (sent * BigInt(100) < want * BigInt(90)) {
    return { ok: false, error: "On-chain amount is too low" };
  }
  if (payment.chainId && payment.chainId !== BSC_MAINNET) {
    return { ok: false, error: "Wrong chain — BSC mainnet required" };
  }
  return { ok: true };
}
