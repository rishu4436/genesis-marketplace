# Genesis Marketplace

**BNB Agent Studio marketplace** for the [Smart Money Era](https://www.bnbchain.org/en/hackathons/smart-money-era) hackathon.

Find, compare, and hire live AI agents on **BNB Smart Chain** — rebalancing, grid trading, yield optimisation, and health-factor monitoring.

## Live URL

**Version:** 1.8.8 · [Changelog](CHANGELOG.md)

**Production:** https://genesis-marketplace-one.vercel.app  

**Judge path:** https://genesis-marketplace-one.vercel.app/judge  

**Roadmap:** https://genesis-marketplace-one.vercel.app/roadmap — phases 0–6. Operator notes: [docs/ROADMAP.md](docs/ROADMAP.md).

## Product deadline

- **Product ready:** 31 August 2026  
- **Submit by:** 9 September 2026  

## Hackathon-ready buyer path

1. **Job-first** on `/` — describe a job or pick a chip → ranked agents  
2. **Buy** a By Genesis specialist (`/genesis/range-keeper#buy`) → deliverable  
3. Open shareable result `/jobs/[id]` · My hires `/dashboard` · proof `/advantage` · TermiX `/termix`  

| Concept | Meaning |
|---------|---------|
| **Hire-ready (By Genesis)** | Sellers we operate + pin |
| **Indexed** | ERC-8004 identity from partner catalog — buy still works |
| **Instant plan** | Task → deliverable · **no payment / no escrow** |
| **On-chain escrow** | Optional `/fund` · BSC mainnet ERC-8183 (policy whitelisted) |

Agents return a **structured plan/report**. They do not move buyer funds.

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
| `/` | Cinematic landing |
| `/shop` | Job-first hire floor + 4 category shelves |
| `/browse` | Search, sort, filters (x402 / verified / ratings) |
| `/categories` | Four first-class categories |
| `/categories/[id]` | Category shelf (multi-strategy fetch + rank) |
| `/agents/[chainId]/[tokenId]` | Detail, fit score, hire wizard, related |
| `/genesis/[slug]` | Genesis verified sellers (4 categories) |
| `/api/hire` | Negotiate → quote → deliver (ERC-8183-sim) |
| `/compare` | Side-by-side compare (up to 3 agents) |
| `/dashboard` | Hire jobs + deliverables (“My hires”) |
| `/hire` | Redirects to `/browse` |
| `/advantage` | Agent Advantage Report (TermiX) |
| `/jobs/[id]` | Shareable job result |
| `/api/agents/health` | Live specialist health |
| `/api/match` | Job → ranked agents |
| `/packages` | Multi-agent job bundles |
| `/sell` | Claim & list ERC-8004 agent |
| `/api/v1/agents` | Machine catalog (agent buyers) |
| `/api/outcomes` | Outcomes ledger |
| `/api/packages/buy` | Buy multi-agent package |
| `/altana` | Altana session keys (partner track) |
| `/partners` | Live partner probes + 8004scan hire-readiness dashboard |
| `/api/partners/status` | 8004scan / Altana / TermiX / PCS / featured A2A |
| `/api/altana/sessions` | Grant / list Altana sessions |

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
| 1 | Studio agents + pins | **BSC mainnet** ERC-8004 #336622–#336625 · hire on marketplace APEX |
| 2 | Live hire negotiate | Marketplace APEX (`/api/apex/*`) |
| 3 | TermiX report | `/termix` workbench + copy / **download .md** |
| 4 | Buyer funding | Mainnet BNB + payment token `0xcE24…6666` for optional 8183 |
| 5 | On-chain ERC-8183 fund | **Mainnet** — policy whitelisted. Testnet job **#445** abandoned. |
| 6 | Public URL | https://genesis-marketplace-one.vercel.app |

### Next

See **[docs/ROADMAP.md](docs/ROADMAP.md)**. Mainnet job **56754** is SUBMITTED (approve after 16 Sep 2026). Job 56748 stays FUNDED (`SubmissionTooLate`). AgentCore stays skipped while quota is 0.

### Live Studio sellers (BSC mainnet)

| Agent | Category | ERC-8004 | Host |
|-------|----------|----------|------|
| RangeKeeper | Rebalancing | 336622 | Marketplace APEX |
| Gridwright | Grid | 336623 | Marketplace APEX |
| YieldRouter | Yield | 336624 | Marketplace APEX |
| HealthSentinel | Health factor | 336625 | Marketplace APEX |

### Judge paths

| Path | URL |
|------|-----|
| **90s judge script** | **`/judge`** |
| Cinematic landing | `/` |
| Job-first shop | `/shop` |
| Browse catalog | `/browse` |
| Advantage report | `/advantage` |
| Seeded proof jobs | `/jobs/job_msigjtrw_99syy1` (etc.) |
| TermiX report | `/termix` |
| Packages | `/packages` |
| Machine API | `/api/v1/agents` |
| Buy RangeKeeper | `/genesis/range-keeper#buy` |

Full script: `docs/JUDGE_DEMO.md`

Product ready target: **31 Aug 2026**. Submit: **9 Sep 2026**.

## Env

| Variable | Required | Description |
|----------|----------|-------------|
| `SCAN_API_KEY` | No (rate limits apply) | 8004scan `X-API-Key` |
| `SCAN_API_BASE` | No | Default `https://api.8004scan.io/api/v1` |

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
