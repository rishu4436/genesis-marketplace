# Genesis Agent Model v2

Inspired by [bnb-chain/stockanalyst-agent-demo](https://github.com/bnb-chain/stockanalyst-agent-demo), improved for a **multi-agent marketplace**.

## What we took from StockAnalyst

| StockAnalyst | Genesis v2 |
|--------------|------------|
| Free x402 quote | **Free scan** tier (~1s metrics + rec) |
| Paid full analysis | **Full analysis** multi-source report |
| ERC-8183 escrow | **Escrow** tier (analysis now + `/fund` path) |
| UOMP portfolio context | **Buyer context** panel (risk + positions) |
| Multi-source data + thesis | CoinGecko + specialist math + bull/bear + hard rec |
| Buyer + seller commerce | Same hire API, marketplace discovery on top |

## What is better for a marketplace

1. **Job-first discovery** across 4 DeFi categories (not one stock agent)
2. **Specialist matching** + scores + packages
3. **Shareable jobs** + outcomes ledger
4. Free scan never blocks; full analysis is default
5. Escrow never dead-ends — full report always, on-chain when policy allows

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
