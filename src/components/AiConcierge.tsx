"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadBuyerContext } from "@/lib/buyer-context";

type Msg = { role: "user" | "assistant"; content: string };

type ConciergeData = {
  ai: boolean;
  answer: string;
  picks: {
    slug: string;
    name: string;
    score: number;
    why: string;
    buyHref: string;
    priceUsd: number;
  }[];
  cta?: { label: string; href: string };
};

export function AiConcierge() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [history, setHistory] = useState<Msg[]>([]);
  const [last, setLast] = useState<ConciergeData | null>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((j) => setAiOn(Boolean(j?.data?.enabled)))
      .catch(() => setAiOn(false));
  }, []);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    const nextHist: Msg[] = [...history, { role: "user", content: message }];
    setHistory(nextHist);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: nextHist.slice(0, -1),
          buyerContext: loadBuyerContext(),
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: ConciergeData;
      };
      if (json.success && json.data) {
        setLast(json.data);
        setHistory((h) => [
          ...h,
          { role: "assistant", content: json.data!.answer },
        ]);
      }
    } catch {
      setHistory((h) => [
        ...h,
        { role: "assistant", content: "Concierge unavailable. Try /hire." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex h-12 items-center gap-2 rounded-full bg-[#F0B90B] px-4 text-sm font-semibold text-black shadow-lg shadow-amber-900/30 transition hover:bg-amber-300"
      >
        <span className="text-base">✦</span>
        AI Concierge
        {aiOn === false && (
          <span className="rounded-full bg-black/15 px-1.5 text-[9px]">off</span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[min(28rem,70vh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0a0c12] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Genesis AI</p>
              <p className="text-[10px] text-white/40">
                Hire advisor
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {history.length === 0 && (
              <p className="text-xs leading-relaxed text-white/45">
                Ask anything about hiring specialists — e.g. “I have Venus debt
                and idle USDT, what should I hire?”
              </p>
            )}
            {history.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "ml-6 bg-amber-400/15 text-amber-50"
                    : "mr-4 bg-white/[0.06] text-white/75"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <p className="text-[11px] text-white/35">Thinking…</p>
            )}
            {last?.picks && last.picks.length > 0 && (
              <div className="space-y-1.5">
                {last.picks.map((p) => (
                  <Link
                    key={p.slug}
                    href={p.buyHref}
                    className="block rounded-lg border border-white/10 px-2.5 py-2 text-[11px] hover:border-amber-400/40"
                  >
                    <span className="font-semibold text-white">{p.name}</span>
                    <span className="text-white/40"> · {p.score}/100</span>
                    <p className="mt-0.5 text-white/45">{p.why}</p>
                  </Link>
                ))}
              </div>
            )}
            {last?.cta && (
              <Link
                href={last.cta.href}
                className="inline-flex rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-semibold text-black"
              >
                {last.cta.label}
              </Link>
            )}
          </div>

          <div className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask the marketplace…"
              className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-amber-400/40"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading}
              className="rounded-full bg-amber-400 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
