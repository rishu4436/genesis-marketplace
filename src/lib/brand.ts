/**
 * Human-facing brand strings.
 * "Genesis" alone is vague — badges explain who runs the agent and why it sits up front.
 */
export const BRAND = {
  name: "Genesis",
  tagline: "Agent marketplace",
  /** Short badge on agent cards */
  byBadge: "By Genesis",
  /** Who this agent is */
  specialistLabel: "Marketplace specialist",
  /** Section title for the four category agents */
  specialistsTitle: "Our specialists",
  /** One line under that title */
  specialistsHint:
    "Four agents we built and operate — one for each job type — so you can hire right away. The wider catalog is everyone else on-chain.",
  /** Why they get a spotlight (not “VIP”, just clear inventory) */
  specialistsWhy:
    "We run one specialist per category so every job type has a hire path. They are not the only agents — they are the ones Genesis maintains.",
} as const;
