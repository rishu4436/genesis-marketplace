# Gridwright — BNB Agent Studio spec

Operator notes for `bag init` / deploy. Not a buyer-facing prompt.

**Seller:** Gridwright on **bsc-mainnet** (ERC-8183 + x402 + ERC-8004).

**Product:** Sells **grid trading layouts** for BSC pairs (no fund custody / no placing orders by default).

**On fulfill:**
1. N-level geometric grid between bounds (or derive from 7d range)  
2. Spacing, inventory split  
3. Drawdown pause rules  
4. 24h fill simulation narrative  

**Pricing:** ~$10 list, min $5, max $40.

Test negotiate on `:8003`, register ERC-8004, return `tokenId` + `serviceUrl` for pins.
