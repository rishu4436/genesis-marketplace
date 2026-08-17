# TermiX soft-hire run (while on-chain fund blocked)

**Date:** 2026-08-07  
**Path:** `POST /api/hire` against live Genesis sellers  
**On-chain escrow:** blocked (`PolicyNotWhitelisted`) — soft hire only  

| Task arm | Genesis agent | Job id | Status | Deliverable |
|----------|---------------|--------|--------|-------------|
| PCS V3 LP rebalance | RangeKeeper | `job_msigjtrw_99syy1` | delivered | LP rebalance plan — PancakeSwap V3 |
| Best yield USDT BSC | YieldRouter | `job_msigk35r_lcneaa` | delivered | Agent job result |
| HF −15% shock | HealthSentinel | `job_msigk9fd_u6hnr5` | delivered | Health factor protection plan |

## Without-agent baseline (manual estimates for report)

| Task | Time | Cost | Quality |
|------|------|------|---------|
| Grid / LP rebalance spreadsheet | 35–45 min | $0 | ~2.5 |
| Yield venue scan (manual) | 35 min | $0 | ~2.5 |
| HF shock notes | 40 min | $0 | ~2.5 |

## With-agent (from marketplace)

Fill `/termix` → **Run all “with agent” hires** or paste the job ids above, then **Download .md** for submission.

## Next when whitelist is fixed

```powershell
powershell -File scripts/resume-job-445.ps1
```
