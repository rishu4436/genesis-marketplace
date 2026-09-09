import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { GENESIS_AGENTS } from "@/lib/genesis-agents";
import { siteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();

  const staticRoutes = [
    "",
    "/browse",
    "/roadmap",
    "/categories",
    "/browse?index=1",
    "/packages",
    "/dashboard",
    "/advantage",
    "/judge",
    "/termix",
    "/sell",
    "/compare",
    "/fund",
    "/why",
    "/for-agents",
    "/altana",
    "/partners",
    "/agents/56/265375",
    "/agents/56/302258",
    "/agents/56/304493",
    "/agents/56/302257",
    "/agents/56/304494",
    "/agents/56/310460",
    "/agents/56/269223",
    "/agents/56/269224",
    "/agents/56/269228",
    "/agents/56/265876",
    "/agents/56/266933",
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
