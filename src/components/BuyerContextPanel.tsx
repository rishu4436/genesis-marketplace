"use client";

import { useEffect, useState } from "react";
import {
  defaultBuyerContext,
  loadBuyerContext,
  saveBuyerContext,
  type BuyerContext,
  type BuyerRisk,
} from "@/lib/buyer-context";

type Props = {
  onChange?: (ctx: BuyerContext) => void;
  compact?: boolean;
};

export function BuyerContextPanel({ onChange, compact }: Props) {
  const [ctx, setCtx] = useState<BuyerContext>(defaultBuyerContext());
  const [open, setOpen] = useState(!compact);

  useEffect(() => {
    const loaded = loadBuyerContext();
    setCtx(loaded);
    onChange?.(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(patch: Partial<BuyerContext>) {
    const next = saveBuyerContext({ ...ctx, ...patch }) || {
      ...ctx,
      ...patch,
    };
    setCtx(next);
    onChange?.(next);
  }

  const total = ctx.positions.reduce((s, p) => s + p.notionalUsd, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Buyer context
        </span>
        <span className="text-[11px] text-amber-200/80">
          {ctx.risk} · ${total.toLocaleString()} {open ? "▾" : "▸"}
        </span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 border-t border-white/8 pt-2">
          <p className="text-[10px] leading-relaxed text-white/40">
            Like UOMP Guard — specialists personalise plans to your book.
          </p>
          <label className="block text-[10px] text-white/45">
            Risk
            <select
              value={ctx.risk}
              onChange={(e) =>
                update({ risk: e.target.value as BuyerRisk })
              }
              className="mt-0.5 w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </label>
          <ul className="max-h-28 space-y-1 overflow-y-auto text-[10px] text-white/50">
            {ctx.positions.map((p) => (
              <li key={p.id}>
                {p.kind} · {p.pairOrAsset} · ${p.notionalUsd}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              const d = defaultBuyerContext();
              saveBuyerContext(d);
              setCtx(d);
              onChange?.(d);
            }}
            className="text-[10px] font-medium text-amber-300/80 hover:text-amber-200"
          >
            Reset demo portfolio
          </button>
        </div>
      )}
    </div>
  );
}
