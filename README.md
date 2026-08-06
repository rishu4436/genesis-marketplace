# Genesis Marketplace

**BNB Agent Studio marketplace** for the [Smart Money Era](https://www.bnbchain.org/en/hackathons/smart-money-era) hackathon.

Find, compare, and hire live AI agents on **BNB Smart Chain** — rebalancing, grid trading, yield optimisation, and health-factor monitoring.

## Product deadline

- **Product ready:** 31 August 2026  
- **Submit by:** 9 September 2026  

## Stack

- Next.js (App Router) + TypeScript + Tailwind  
- [8004scan](https://8004scan.io/developers) public API (ERC-8004 agents)  
- BSC chainId `56`

## Quick start

```bash
npm install
cp .env.example .env.local   # add SCAN_API_KEY if you have one
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Purpose |
|------|---------|
| `/` | Marketplace home + 4 category shelves |
| `/browse` | Search, sort, filters (x402 / verified / feedback) |
| `/categories` | Four first-class categories |
| `/categories/[id]` | Category shelf (multi-strategy fetch + rank) |
| `/agents/[chainId]/[tokenId]` | Detail, fit score, hire wizard, related |
| `/genesis/[slug]` | Genesis verified sellers (4 categories) |
| `/api/hire` | Negotiate → quote → deliver (ERC-8183-sim) |
| `/compare` | Side-by-side compare (up to 3 agents) |
| `/dashboard` | Hire jobs + deliverables (“My hires”) |
| `/hire` | Hire flow explainer |

### Genesis verified agents

| Slug | Category | Name |
|------|----------|------|
| `range-keeper` | Rebalancing | RangeKeeper (PCS LP) |
| `gridwright` | Grid trading | Gridwright |
| `yield-router` | Yield | YieldRouter |
| `health-sentinel` | Health factor | HealthSentinel |

Hire path: brief → `POST /api/hire` → live `serviceUrl/negotiate` (APEX) → quote + deliverable.

### Priorities status

| # | Priority | Status |
|---|----------|--------|
| 1 | Studio agents + pins | **3 live** on BNB free platform (max 3) + Gridwright local APEX |
| 2 | Live hire negotiate | Platform A2A + local APEX fallback |
| 3 | TermiX report | `/termix` workbench |
| 4 | Public URL | Deferred to end |

### Live Studio sellers (free platform trial)

| Agent | Category | ERC-8004 | Host |
|-------|----------|----------|------|
| RangeKeeper | Rebalancing | 1773 | BNB platform |
| YieldRouter | Yield | 1774 | BNB platform |
| HealthSentinel | Health factor | 1775 | BNB platform |
| Gridwright | Grid | — | Local APEX (quota) |

Trial expires ~**2026-08-08T15:28Z**. Redeploy while active: `scripts/redeploy-platform-agents.ps1`.

### Judge paths

| Path | URL |
|------|-----|
| Demo checklist | `/demo` |
| Ops / pins | `/ops` |
| TermiX report | `/termix` |
| Hire RangeKeeper | `/genesis/range-keeper` |

Product ready target: **31 Aug 2026**. Submit: **9 Sep 2026**.

## Env

| Variable | Required | Description |
|----------|----------|-------------|
| `SCAN_API_KEY` | No (rate limits apply) | 8004scan `X-API-Key` |
| `SCAN_API_BASE` | No | Default `https://8004scan.io/api/v1/public` |

Hackathon Pro tier: create a key at [8004scan Developer Hub](https://8004scan.io/developers), then [Pro upgrade form](https://forms.gle/jQevEPCAacBXaKG79).

## Week plan (Aug)

1. **Now** — Marketplace shell + live 8004scan data (this repo)  
2. **W2** — Deploy 4 category agents (Agent Studio) + ERC-8183 hire MVP  
3. **W3** — Depth, PCS story, TermiX task data  
4. **W4 → 31 Aug** — Product freeze  

## Hackathon entry

- Submit: https://forms.gle/9g9XPNFwnYaHAz9L8  
- Tracks: Main + TermiX + PancakeSwap (+ Altana stretch)

## License

Private / hackathon project unless otherwise stated.
