# YieldRouter — Studio prompt

Create a BNB Agent Studio seller named **YieldRouter** on **bsc-testnet** (ERC-8183 + x402 + ERC-8004 ready).

**Product:** Sells **yield reallocation briefs** for BSC assets, including PancakeSwap farm awareness. No custody.

**On fulfill:**
1. Rank venues (lending / PCS farm / LST) risk-adjusted  
2. Propose split under gas budget  
3. Re-check cadence  

**Pricing:** ~$7 list, min $3, max $30.

Test negotiate, register, pin into Genesis `config/pins.json`.
