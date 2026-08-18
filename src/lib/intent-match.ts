/**
 * Job-first intent matching: brief → eligibility-gated organic rank.
 */

import type { CategoryId } from "./categories";
import type { GenesisAgent } from "./genesis-agents";
import { JOB_CHIPS, detectCategory, type JobChip } from "./job-chips";
import {
  listingToMatchShape,
  rankGenesisForJob,
  type RankedListing,
} from "./job-rank";

export { JOB_CHIPS, detectCategory };
export type { JobChip };

export type MatchedAgent = {
  agent: GenesisAgent;
  href: string;
  buyHref: string;
  score: number;
  reasons: string[];
  categoryId: CategoryId;
  categoryName: string;
  eligible?: boolean;
  hireable?: boolean;
  organicRank?: number | null;
};

export function matchAgentsForJob(
  query: string,
  limit = 3,
): {
  categoryId: CategoryId | null;
  categoryName: string | null;
  matches: MatchedAgent[];
  excluded: RankedListing[];
  normalizedTask: string;
  paidRank: false;
} {
  const ranked = rankGenesisForJob(query, undefined, limit);
  return {
    categoryId: ranked.categoryId,
    categoryName: ranked.categoryName,
    matches: ranked.organic.map((row) =>
      listingToMatchShape(row, ranked.task),
    ),
    excluded: ranked.excluded,
    normalizedTask: ranked.task,
    paidRank: false,
  };
}
