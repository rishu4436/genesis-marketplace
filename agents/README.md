# Genesis Agent Studio packs

Priority 1: deploy **four** sellers with [BNB Agent Studio](https://docs.bnbchain.org/developer-kit/bnbchain-studio/quickstart/), then pin them in `config/pins.json`.

## One-time machine setup

```bash
pip install bnbagent-studio
bag --version

npm install -g @aws/agentcore   # Node ≥ 20
bag skills install --target both --scope user
# reload IDE
```

## Per agent (repeat ×4)

| Folder | Category | Prompt file |
|--------|----------|-------------|
| `range-keeper` | Rebalancing / PCS LP | `range-keeper/STUDIO_PROMPT.md` |
| `gridwright` | Grid trading | `gridwright/STUDIO_PROMPT.md` |
| `yield-router` | Yield / PCS | `yield-router/STUDIO_PROMPT.md` |
| `health-sentinel` | Health factor | `health-sentinel/STUDIO_PROMPT.md` |

### Commands (example: RangeKeeper)

```bash
# Empty folder, then in Cursor/Claude paste STUDIO_PROMPT.md
# or:
bag init range-keeper --network bsc-testnet --llm-provider pieverse-llm --no-onboard

# In a private terminal (password never in chat):
# set WALLET_PASSWORD=...
# bag wallet new
# bag llm activate
# bag dev
# curl -X POST http://localhost:8003/apex/negotiate -H "Content-Type: application/json" -d "{\"task_description\":\"test\"}"

# After public Layer B URL:
# bag erc8004 register --endpoint https://YOUR_HOST:8003/apex
# bag deploy ...
```

### Pin into marketplace

Edit `config/pins.json`:

```json
"range-keeper": {
  "tokenId": "12345",
  "chainId": 97,
  "serviceUrl": "https://YOUR_HOST:8003/apex",
  "walletAddress": "0x...",
  "agentId": "..."
}
```

Or env:

```
GENESIS_PIN_RANGE_KEEPER=56:YOUR_MAINNET_TOKEN_ID
GENESIS_SERVICE_RANGE_KEEPER=https://YOUR_HOST:8003/apex
```

Until pins are set, the marketplace uses **local APEX** at:

`http://localhost:3000/api/apex/<slug>/negotiate`

## Checklist

- [ ] CLI installed  
- [ ] 4 × `bag init` + wallet + llm activate  
- [ ] Local negotiate works on :8003  
- [ ] Deploy Layer A + B (or keep local for demo)  
- [ ] ERC-8004 register + tokenId known  
- [ ] `config/pins.json` filled  
- [ ] Marketplace hire shows `ERC-8183-live` in timeline  
