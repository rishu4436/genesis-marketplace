"use client";

import { usePathname } from "next/navigation";
import { AgentNetworkBackdrop } from "@/components/brand/AgentNetworkBackdrop";

/**
 * Marketplace shell backdrop for all pages.
 * Landing has its own stronger backdrop — hide shell there to avoid double layers.
 */
export function AppShellBackground() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <AgentNetworkBackdrop intensity="app" />;
}
