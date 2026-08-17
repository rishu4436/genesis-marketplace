# On-chain ERC-8183 fund & settle

## Flow

1. **Negotiate** (soft hire) — marketplace A2A / APEX quote  
2. **Buy / fund** — `bag erc8183 buy --provider <seller>` (create + register + setBudget + fund)  
3. **notify_funded** — A2A message so seller delivers  
4. **Poll** — `bag erc8183 status <job_id>` until `SUBMITTED`  
5. **Fetch** — `bag erc8183 fetch <job_id>`  
6. **Settle** — `approve` only after **24h** dispute window; or `dispute` within window  

## UI

- `/fund` — faucet links + on-chain hire panel  
- `POST /api/hire/onchain` — `{ action: "buy"|"status"|"fetch"|"settle" }`

## Buyer wallet

Default: `studio/RangeKeeper` agent wallet (override with `BUYER_PROJECT`).

Must hold:

| Asset | Why | Suggested |
|-------|-----|-----------|
| **tBNB** | Gas for ERC-20 `approve` (first fund) | ≥ 0.05 |
| **$U** | Job escrow (paymentToken) | ≥ 0.5 |

Payment token (testnet commerce): `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565`

## Faucets

- tBNB: https://www.bnbchain.org/en/testnet-faucet  
- tBNB: https://faucet.chainstack.com/bnb-testnet-faucet  
- $U: https://united-coin-u.github.io/u-faucet/  

## CLI (after funding)

```powershell
cd studio/RangeKeeper/app/agent
# load WALLET_PASSWORD from ../../.studio/.env.local

bag wallet balance

# Hire YieldRouter seller by provider address
bag erc8183 buy --provider 0xe588cD118A7D960a5f64788Ed2F61e873daC97E4 `
  --task "Find best yield for USDT on BSC" --budget-u 0.5 --deadline-min 60

bag erc8183 status <job_id>
# after SUBMITTED:
bag erc8183 fetch <job_id>
# after 24h:
bag erc8183 settle <job_id> --action approve
```

## Notes

- Studio v1 is **seller-first**; buy CLI is the supported buyer path for tests.  
- Free platform trial expiry does **not** remove on-chain jobs already funded.  
- If buy fails with 0 balance, faucets are the blocker — not the marketplace code.

## Known testnet issue (2026-08-06)

`bag erc8183 buy` does: **create → register → set_budget → fund**.

On BSC testnet the default OptimisticPolicy is **not whitelisted** on EvaluatorRouter:

| Item | Value |
|------|--------|
| Router | `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25` |
| Policy (SDK) | `0x4f4678d4439fec812ac7674bb3efb4c8f5fb78a6` |
| `policyWhitelist(policy)` | **false** |
| Revert on `registerJob` | `PolicyNotWhitelisted()` (`0xc94463e3`) |
| Revert on `fund` without register | `PolicyNotSet()` (`0x32d53d69`) |

So create + set_budget can succeed, but **register + fund cannot** until BNB re-whitelists the policy (protocol admin). Soft hire (A2A quote only) is unaffected.

### Partial job from our e2e attempt

| Field | Value |
|-------|--------|
| job_id | **445** |
| buyer | `0xa17E5B37b8987DF7aACd00Fe37A64Ce9dccD0133` |
| provider (YieldRouter) | `0xe588cD118A7D960a5f64788Ed2F61e873daC97E4` |
| budget | 0.5 U (set on-chain) |
| status | OPEN (not funded; no policy) |
| buyer balances after | ~0.1 tBNB, **10 U** (escrow not taken) |

When whitelist is fixed, resume with:

```powershell
cd studio/RangeKeeper/app/agent
# WALLET_PASSWORD loaded
python -c "from bnbagent_studio_core.erc8183.client import get_8183_client; from bnbagent_studio_core.wallet import get_wallet; get_wallet(); c=get_8183_client('bsc-testnet'); print(c.register_job(445)); print(c.fund(445, 5*10**17, approve_floor=5*10**17))"
```

Then marketplace `notify_funded` + `bag erc8183 status 445` + fetch/settle.
