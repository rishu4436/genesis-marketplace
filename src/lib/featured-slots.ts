/**
 * Featured inventory — labeled, never organic.
 * Buying stars or a featured pin cannot move organic rank.
 */

import { CATEGORIES, type CategoryId } from "./categories";
import {
  getFeaturedThirdParty,
  thirdPartyHref,
} from "./third-party-sellers";

export const FEATURED_SUITE = "featured-slot-v1";

export type FeaturedSlot = {
  suiteId: typeof FEATURED_SUITE;
  slot: "featured";
  label: "Featured";
  organic: false;
  paidRank: false;
  reason: string;
  slug: string;
  name: string;
  categoryId: CategoryId;
  href: string;
  buyHref: string;
  tagline: string;
};

function buyHrefForFeatured(
  href: string,
  task?: string,
): string {
  const q = new URLSearchParams();
  if (task?.trim()) q.set("task", task.trim());
  q.set("buy", "1");
  return `${href}?${q.toString()}#buy`;
}

export function featuredSlotsForJob(
  categoryId: CategoryId | null,
  task?: string,
): FeaturedSlot[] {
  const seller = getFeaturedThirdParty(categoryId);
  if (!seller) return [];
  return [
    {
      suiteId: FEATURED_SUITE,
      slot: "featured",
      label: "Featured",
      organic: false,
      paidRank: false,
      reason: "Labeled partner listing — not an organic rank",
      slug: seller.slug,
      name: seller.name,
      categoryId: seller.categoryId,
      href: thirdPartyHref(seller),
      buyHref: buyHrefForFeatured(thirdPartyHref(seller), task),
      tagline: seller.tagline,
    },
  ];
}

export function allFeaturedSlots(task?: string): FeaturedSlot[] {
  return CATEGORIES.flatMap((c) => featuredSlotsForJob(c.id, task));
}

export function featuredNeverInOrganic(
  organicSlugs: string[],
  featured: FeaturedSlot[],
): boolean {
  const set = new Set(organicSlugs);
  return featured.every((f) => !set.has(f.slug));
}
