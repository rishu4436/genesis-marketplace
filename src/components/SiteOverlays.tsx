"use client";

import { usePathname } from "next/navigation";
import { CompareTray } from "@/components/CompareTray";
import { AiConcierge } from "@/components/AiConcierge";

/**
 * Concierge + compare tray sit below result controls (z-40 vs z-60).
 * Hide entirely on receipt pages so they cannot intercept Share / Accept.
 */
export function SiteOverlays() {
  const pathname = usePathname() || "";
  if (pathname.startsWith("/jobs")) return null;
  const onListing =
    pathname.startsWith("/genesis/") ||
    /^\/agents\/\d+\//.test(pathname);
  const showCompare =
    pathname.startsWith("/browse") || pathname.startsWith("/compare");
  return (
    <>
      {showCompare ? <CompareTray /> : null}
      {onListing ? null : <AiConcierge />}
    </>
  );
}
