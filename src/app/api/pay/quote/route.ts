import { NextResponse } from "next/server";
import { parseEther } from "viem";
import {
  BSC_MAINNET,
  treasuryAddress,
  type WalletQuote,
} from "@/lib/wallet-pay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function bnbUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT",
      { cache: "no-store" },
    );
    const json = (await res.json()) as { price?: string };
    const n = Number(json.price);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* fall through */
  }
  return 600;
}

export async function GET(req: Request) {
  const usd = Math.max(
    0.01,
    Number(new URL(req.url).searchParams.get("usd") || "10") || 10,
  );
  const price = await bnbUsd();
  const bnb = usd / price;
  const wei = parseEther(bnb.toFixed(8)).toString();
  const quote: WalletQuote = {
    usd,
    bnbUsd: price,
    bnb: bnb.toFixed(6),
    wei,
    weiHex: `0x${BigInt(wei).toString(16)}`,
    to: treasuryAddress(),
    chainId: BSC_MAINNET,
  };
  return NextResponse.json({ success: true, data: quote });
}
