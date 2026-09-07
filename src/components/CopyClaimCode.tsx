"use client";

import { useState } from "react";

export function CopyClaimCode({
  code,
  buttonOnly = false,
}: {
  code: string;
  buttonOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!code.trim()) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      {!buttonOnly && (
        <span className="rounded-full border border-amber-400/25 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-200">
          {code}
        </span>
      )}
      <button
        type="button"
        onClick={() => void copy()}
        className="relative z-[60] rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-medium text-white/60 hover:text-white"
      >
        {copied ? "Copied" : "Copy claim"}
      </button>
    </span>
  );
}
