import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { GENESIS_AGENTS } from "@/lib/genesis-agents";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://genesis-marketplace.vercel.app";

  const staticRoutes = [
    "",
    "/browse",
    "/categories",
    "/hire",
    "/packages",
    "/profile",
    "/dashboard",
    "/login",
    "/advantage",
    "/judge",
    "/termix",
    "/sell",
    "/compare",
    "/fund",
    "/shop",
    "/why",
    "/for-agents",
    "/altana",
    "/partners",
    "/agents/56/265375",
  ].map((p) => ({
    url: `${base}${p || "/"}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.8,
  }));

  const cats = CATEGORIES.map((c) => ({
    url: `${base}/categories/${c.id}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  const genesis = GENESIS_AGENTS.map((a) => ({
    url: `${base}/genesis/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [...staticRoutes, ...cats, ...genesis];
}
