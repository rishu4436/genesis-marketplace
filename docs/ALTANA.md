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

## Live proof (2026-09-08)

RangeKeeper session granted and revoked on **BSC mainnet** (chain 56):

- Wallet / admin: `0xd951d3264ab6aA83f4eAD247e35F96F140304b93`
- Keystore: `0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a`
- Grant tx: https://bscscan.com/tx/0x5699a3d1cad0902bef14846df05910505e3063842a88a5888be250da11ad71e1
- Revoke tx: https://bscscan.com/tx/0xa69610c4a00d3e9b9a57f554daaa428775e0c23480e4bd0ae769ca2d0a182bb3
- Altana explorer: https://explorer.altana.network/account/0xd951d3264ab6aA83f4eAD247e35F96F140304b93

Commit `config/altana-proof.json` so Vercel `/judge` shows this even without the admin key on the host.
