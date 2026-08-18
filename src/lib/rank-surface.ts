/**
 * Public rank payload: organic + featured + growth.
 * Featured is attached here so it cannot leak into rankGenesisForJob.
 */

import type { JobRankResult } from "./job-rank";
import { featuredSlotsForJob, type FeaturedSlot } from "./featured-slots";
import { growthLoops, type GrowthLoop } from "./growth-loops";

export type RankSurface = JobRankResult & {
  featured: FeaturedSlot[];
  growth: GrowthLoop[];
};

export function decorateRankSurface(rank: JobRankResult): RankSurface {
  return {
    ...rank,
    featured: featuredSlotsForJob(rank.categoryId, rank.task),
    growth: growthLoops({ task: rank.task }),
  };
}
