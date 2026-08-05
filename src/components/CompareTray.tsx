"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const KEY = "genesis-compare";

function readKeys(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function useCompareKeys() {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    setKeys(readKeys());
    const onStorage = () => setKeys(readKeys());
    window.addEventListener("storage", onStorage);
    window.addEventListener("genesis-compare", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("genesis-compare", onStorage);
    };
  }, []);

  const toggle = useCallback((key: string) => {
    const cur = readKeys();
    let next: string[];
    if (cur.includes(key)) {
      next = cur.filter((k) => k !== key);
    } else if (cur.length >= 3) {
      next = [...cur.slice(1), key];
    } else {
      next = [...cur, key];
    }
    localStorage.setItem(KEY, JSON.stringify(next));
    setKeys(next);
    window.dispatchEvent(new Event("genesis-compare"));
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setKeys([]);
    window.dispatchEvent(new Event("genesis-compare"));
  }, []);

  return { keys, toggle, clear, has: (k: string) => keys.includes(k) };
}

export function CompareToggle({ agentKey }: { agentKey: string }) {
  const { has, toggle } = useCompareKeys();
  const active = has(agentKey);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(agentKey);
      }}
      className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
        active
          ? "bg-amber-400/20 text-amber-200"
          : "bg-white/10 text-white/55 hover:bg-white/15 hover:text-white"
      }`}
    >
      {active ? "In compare" : "Compare"}
    </button>
  );
}

export function CompareTray() {
  const { keys, clear } = useCompareKeys();
  if (keys.length === 0) return null;

  const href = `/compare?ids=${keys.map(encodeURIComponent).join(",")}`;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(100%-2rem,36rem)] -translate-x-1/2 rounded-2xl border border-amber-400/30 bg-[#0c1018]/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-white/70">
          <span className="font-semibold text-amber-200">
            {keys.length} agent{keys.length > 1 ? "s" : ""}
          </span>{" "}
          selected to compare
          <div className="truncate font-mono text-[10px] text-white/35">
            {keys.join(" · ")}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={clear}
            className="rounded-lg px-2 py-1.5 text-xs text-white/50 hover:text-white"
          >
            Clear
          </button>
          <Link
            href={href}
            className="rounded-lg bg-[#F0B90B] px-3 py-1.5 text-xs font-semibold text-black hover:bg-amber-300"
          >
            Compare
          </Link>
        </div>
      </div>
    </div>
  );
}
