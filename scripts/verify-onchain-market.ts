import {
  fetchOnchainMarket,
  formatOnchainSection,
} from "../src/lib/onchain-market";

async function main() {
  const m = await fetchOnchainMarket();
  console.log(formatOnchainSection(m));
  const live = m.pools.filter((p) => p.ok).length + m.venus.filter((v) => v.ok).length;
  if (live < 1) {
    console.error("FAIL  no live BSC reads");
    process.exit(1);
  }
  console.log(`PASS  ${live} live on-chain rows`);
}

main();
