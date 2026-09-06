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

1. **Live** — default when `ALTANA_ADMIN_PRIVATE_KEY` is set. `grantSession` + Keystore `register: true`. On testnet, a faucet tops up if the EOA is below 0.02 tBNB. On **mainnet**, fund ~0.05 BNB yourself. Failures surface; they do not fall back to demo.
2. **Demo** — only if you check “Force demo”, or if no admin key is configured.

Public proof (no keys) is written to `config/altana-proof.json` **and** KV (`genesis:altana:proof`) so a Vercel grant survives. `/altana` and `/judge` prefer a chain-56 proof over the old testnet file.

## Env

```bash
ALTANA_ADMIN_PRIVATE_KEY=0x...
# mainnet | bnb | 56   → BSC mainnet (prize proof)
# bnb-testnet          → chain 97 (participant only)
ALTANA_NETWORK=mainnet
```

Mainnet grant (do this for the Altana bounty):

```bash
# 1. Fund the admin EOA with ~0.05 BNB on BSC mainnet
# 2. Local:
npx --yes tsx scripts/grant-altana-mainnet.ts
git add config/altana-proof.json && git commit -m "Record Altana mainnet Keystore grant." && git push
# 3. Or Vercel: set the two env vars, redeploy, open /altana → Grant session → RangeKeeper
# 4. Revoke once in-product. Paste the bscscan.com tx on the submit form.
```

Faucet (testnet only): https://testnet.bnbchain.org/faucet-smart

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
