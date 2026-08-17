"use client";

import { useEffect, useMemo, useState } from "react";

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

/** Turn ipfs:// / bare CIDs / broken schemes into a browser-loadable https URL */
export function normalizeImageUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let url = raw.trim();
  if (!url || url === "null" || url === "undefined") return null;

  if (url.startsWith("ipfs://")) {
    const path = url.replace(/^ipfs:\/\/(ipfs\/)?/, "");
    return `${IPFS_GATEWAYS[0]}${path}`;
  }

  if (url.startsWith("/ipfs/")) {
    return `https://ipfs.io${url}`;
  }

  if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}/.test(url) || /^bafy[a-z0-9]+/i.test(url)) {
    return `${IPFS_GATEWAYS[0]}${url}`;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("http://")) {
    try {
      const u = new URL(url);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return url;
      return `https://${u.host}${u.pathname}${u.search}`;
    } catch {
      return url;
    }
  }

  if (url.startsWith("https://")) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  return null;
}

type Props = {
  src?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "h-12 w-12 text-lg",
  md: "h-16 w-16 text-xl",
  lg: "h-20 w-20 text-2xl",
};

/**
 * Agent image with IPFS rewrite + onError fallback.
 */
export function AgentAvatar({
  src,
  name,
  size = "sm",
  className = "",
}: Props) {
  const candidates = useMemo(() => {
    const primary = normalizeImageUrl(src);
    if (!primary) return [] as string[];

    const list = [primary];
    if (src?.includes("ipfs") || primary.includes("/ipfs/")) {
      const cidMatch = primary.match(/\/ipfs\/([^/?#]+)/);
      if (cidMatch) {
        for (const g of IPFS_GATEWAYS) {
          const alt = `${g}${cidMatch[1]}`;
          if (!list.includes(alt)) list.push(alt);
        }
      }
    }
    return list;
  }, [src]);

  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setIdx(0);
    setFailed(false);
  }, [src]);

  const current = !failed && candidates[idx] ? candidates[idx] : null;
  const initial = (name?.trim()?.[0] || "◆").toUpperCase();

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-white/10 to-white/[0.04] ${sizeClass[size]} ${className}`}
    >
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current}
          src={current}
          alt={name ? `${name} avatar` : "Agent"}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (idx + 1 < candidates.length) {
              setIdx((i) => i + 1);
            } else {
              setFailed(true);
            }
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-semibold text-amber-300/90">
          {initial}
        </div>
      )}
    </div>
  );
}
