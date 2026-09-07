"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Scroll to hash targets after client render (landing sections, footer). */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const jump = () => {
      const id = window.location.hash.replace(/^#/, "");
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    jump();
    const timers = [80, 250, 600, 1200].map((ms) => window.setTimeout(jump, ms));
    window.addEventListener("hashchange", jump);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("hashchange", jump);
    };
  }, [pathname]);

  return null;
}
