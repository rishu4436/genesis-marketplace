/**
 * Demo checkout only. No Stripe account, no on-chain transfer.
 * Uses Stripe's public test card numbers so the flow feels real.
 */

export type DemoPayMethod = "card" | "wallet";

export type DemoPayment = {
  id: string;
  method: DemoPayMethod;
  status: "succeeded" | "declined";
  amountUsd: number;
  demo: true;
  createdAt: string;
  last4?: string;
  brand?: string;
  walletAddress?: string;
  walletSource?: "injected" | "demo";
};

export function stripeTestCards() {
  return {
    success: "4242424242424242",
    decline: "4000000000000002",
  };
}

export function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

export function formatCardNumber(s: string) {
  const d = digitsOnly(s).slice(0, 16);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function luhnOk(num: string) {
  const d = digitsOnly(num);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string): string {
  const d = digitsOnly(num);
  if (d.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  return "Card";
}

export function evaluateDemoCard(num: string): {
  ok: boolean;
  error?: string;
} {
  const d = digitsOnly(num);
  if (d.length < 15) return { ok: false, error: "Enter the full card number" };
  if (d === stripeTestCards().decline) {
    return { ok: false, error: "Card declined (Stripe test decline card)" };
  }
  if (d === stripeTestCards().success || luhnOk(d)) {
    return { ok: true };
  }
  return { ok: false, error: "Use 4242 4242 4242 4242 for the demo" };
}

export function makeDemoPayment(
  partial: Omit<DemoPayment, "id" | "demo" | "createdAt" | "status"> & {
    status?: DemoPayment["status"];
  },
): DemoPayment {
  return {
    id: `pay_demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    demo: true,
    createdAt: new Date().toISOString(),
    status: partial.status ?? "succeeded",
    ...partial,
  };
}

export function shortWallet(addr?: string) {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
