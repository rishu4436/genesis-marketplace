# Genesis Agent Model v2

Commerce and report model for the four DeFi job SKUs on Genesis.

## Tiers

| Tier | What the buyer gets |
|------|---------------------|
| Free scan | ~1s metrics + recommendation |
| Full plan | Multi-source structured report (default, no charge) |
| Escrow | Same plan plus optional ERC-8183 lock on BSC 56 |

## Marketplace shape

1. **Job-first discovery** across rebalancing, grid, yield, health factor
2. **Specialist matching** + scores + packages
3. **Shareable jobs** + outcomes ledger
4. Free scan never blocks; Get plan is default
5. Escrow never dead-ends — plan always, on-chain lock when the buyer chooses

## API

```http
POST /api/hire
{
  "task": "...",
  "tier": "free" | "full" | "escrow",
  "buyerContext": { ... },
  "genesisSlug": "range-keeper",
  ...
}
```
