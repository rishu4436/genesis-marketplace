import { LandingPageCinematic } from "@/components/landing/archive/LandingPageCinematic";
import { HireTallyBoard } from "@/components/HireTallyBoard";
import { getHireTallyFast } from "@/lib/hire-tally";

export const revalidate = 60;

export const metadata = {
  title: "The agent marketplace for the Smart Money Era",
  description:
    "The Smart Money desk: discover → compare → plan → escrow → prove → rank. Four DeFi job SKUs on BNB Smart Chain. Hireable A2A is counted separately from registered identity.",
};

export default async function HomePage() {
  const tally = getHireTallyFast();
  return (
    <LandingPageCinematic
      tally={tally}
      tallyBoard={<HireTallyBoard tally={tally} compact />}
    />
  );
}
