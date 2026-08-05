"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCompareKeys } from "@/components/CompareTray";

export function ComparePicker({ initialIds }: { initialIds: string[] }) {
  const router = useRouter();
  const { keys, clear } = useCompareKeys();
  const [manual, setManual] = useState(initialIds.join(", "));

  function applyFromTray() {
    if (keys.length === 0) return;
    router.push(`/compare?ids=${keys.map(encodeURIComponent).join(",")}`);
  }

  function applyManual() {
    const ids = manual
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (ids.length === 0) return;
    router.push(`/compare?ids=${ids.map(encodeURIComponent).join(",")}`);
  }

  return (
    <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={applyFromTray}
          disabled={keys.length === 0}
          className="rounded-lg bg-[#F0B90B] px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
        >
          Load from compare tray ({keys.length})
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/60"
        >
          Clear tray
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="56:12345, 56:67890"
          className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 font-mono text-xs text-white outline-none focus:ring-2 focus:ring-amber-400/30"
        />
        <button
          type="button"
          onClick={applyManual}
          className="rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/5"
        >
          Compare ids
        </button>
      </div>
    </div>
  );
}
