# RangeKeeper — Studio prompt

Paste into Cursor / Claude Code after `bag skills install`:

---

Create a new BNB Agent Studio seller named **RangeKeeper** on **bsc-testnet** with ERC-8183, ERC-8004-ready identity, and x402 (pieverse-llm).

**Product:** Sells PancakeSwap V3 LP **rebalance plans** (no fund custody).

**On fulfill (`handle_fulfill`):**
1. Parse user task for pair / range / notional if present  
2. Diagnose out-of-range risk (simulated OK for MVP)  
3. Propose new band (±% around mark)  
4. Fee APR vs IL notes  
5. Gas-aware steps the user runs in their own wallet  

**Pricing:** list ~$8, min $4, max $25 USD-equivalent in studio.toml `[payments.erc8183]`.

**Output:** structured text/markdown deliverable, not on-chain LP txs from the agent.

After scaffold: set wallet, `bag llm activate`, `bag dev`, test:

```bash
curl -s -X POST http://localhost:8003/apex/negotiate \
  -H "Content-Type: application/json" \
  -d "{\"task_description\":\"Rebalance my PCS V3 CAKE-BNB LP — out of range\"}"
```

Then register ERC-8004 with public service URL and give me `tokenId` + `serviceUrl` for Genesis `config/pins.json`.
