"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Scroll to hash targets after client render (landing sections, footer). */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    const jump = () => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    jump();
    const t = window.setTimeout(jump, 80);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return null;
}
