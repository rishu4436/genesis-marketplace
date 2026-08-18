# Altana integration (Genesis)

Partner track: scoped, revocable agent authority via [Altana](https://docs.altana.network).

## Product surface

| Path | Purpose |
|------|---------|
| `/altana` | Policies + grant/revoke UI |
| Agent page `#altana` | Per-specialist session panel |
| `POST /api/altana/sessions` | Grant session |
| `POST /api/altana/sessions/:id/revoke` | Revoke |
| `GET /api/altana/status` | Network + mode |

## Modes

1. **Live** — default when `ALTANA_ADMIN_PRIVATE_KEY` is set. `grantSession` + Keystore `register: true` on BSC testnet. Testnet faucet is called automatically if the admin EOA is below 0.02 tBNB. Failures surface; they do not fall back to demo.
2. **Demo** — only if you check “Force demo”, or if no admin key is configured.

Public proof (no keys) is written to `config/altana-proof.json` and shown on `/altana` and `/judge`.

## Env

```bash
ALTANA_ADMIN_PRIVATE_KEY=0x...
ALTANA_NETWORK=bnb-testnet
```

Faucet: https://testnet.bnbchain.org/faucet-smart

## Policies

Each Genesis specialist has a template in `src/lib/altana/policies.ts`:

- RangeKeeper → PCS V3 router + NPM  
- Gridwright → PCS routers  
- YieldRouter → Venus + PCS  
- HealthSentinel → Venus  

Spend caps + expiry + call allowlists.

## SDK

`@altananetwork/sdk` · `viem` · `BNB_TESTNET` / `BNB`

## Live proof (2026-08-18)

RangeKeeper session granted on BSC testnet (chain 97), 30-day expiry:

- Wallet / admin: `0xD322D37a6E772ed2c4E32C53f66cd72e20480f80`
- Keystore: `0x6b8361C29d05D498b1a12B54A37310f94171E94A`
- Grant tx: https://testnet.bscscan.com/tx/0xd2802c897877a0b25e12946739d876caeb5327ab25721b9fc74381dd4753eda5

Commit `config/altana-proof.json` so Vercel `/judge` shows this even without the admin key on the host.
