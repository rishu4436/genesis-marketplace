# RangeKeeper — deploy (BNB managed platform trial)

## Already done

- [x] `bag init RangeKeeper --destination platform --network bsc-testnet`
- [x] Throwaway testnet wallet created  
  **Address:** `0xa17E5B37b8987DF7aACd00Fe37A64Ce9dccD0133`
- [x] Wallet password stored in **gitignored** `.studio/.env.local` (never commit)
- [x] `bag llm activate` (Pieverse `auto/free`)
- [x] ERC-8183 price clamp set (list ~0.08 U, max 0.25 U)
- [x] Agent instruction = Genesis RangeKeeper (PCS LP rebalance plans)

## Status

- [x] GitHub platform login as **rishu4436**
- [x] `storage.kind = ipfs` set
- [ ] **STORAGE_API_URL (+ optional KEY)** — required to deploy
- [ ] `bag deploy agent`
- [ ] ERC-8004 register + Genesis pin

### 1) Free Pinata JWT (2 minutes) — required for deploy

1. Sign up / log in: https://app.pinata.cloud/  
2. **API Keys** → create key with **pinFileToIPFS / pinJSONToIPFS**  
3. Copy the **JWT**

Then in PowerShell:

```powershell
cd "D:\Genesis Marketplace\studio\RangeKeeper\app\agent"

# append storage env (gitignored)
@"
STORAGE_API_URL=https://api.pinata.cloud/pinning/pinJSONToIPFS
STORAGE_API_KEY=PASTE_YOUR_PINATA_JWT_HERE
"@ | Add-Content ..\..\.studio\.env.local

Get-Content ..\..\.studio\.env.local | ForEach-Object {
  if ($_ -match '^\s*WALLET_PASSWORD=(.+)$') { $env:WALLET_PASSWORD = $Matches[1].Trim() }
  if ($_ -match '^\s*STORAGE_API_URL=(.+)$') { $env:STORAGE_API_URL = $Matches[1].Trim() }
  if ($_ -match '^\s*STORAGE_API_KEY=(.+)$') { $env:STORAGE_API_KEY = $Matches[1].Trim() }
}

bag deploy prepare
bag deploy agent
bag deploy status
bag deploy info
```

Or paste the JWT here (or say you added it to `.env.local`) and I’ll run deploy.

### 2) Optional: fund tBNB (gas) for ERC-8004 later

Send testnet BNB to:

`0xa17E5B37b8987DF7aACd00Fe37A64Ce9dccD0133`

Faucet: https://testnet.bnbchain.org/faucet-smart

### 3) Deploy (48h trial starts on first success)

```powershell
cd "D:\Genesis Marketplace\studio\RangeKeeper\app\agent"
bag deploy prepare
bag deploy agent
bag deploy status
bag deploy info
```

### 4) Register ERC-8004 + pin into Genesis marketplace

After deploy, note invoke URL from `bag deploy info`:

```powershell
bag erc8004 register --endpoint "<INVOKE_OR_SERVICE_URL>"
bag erc8004 show
```

Then edit `D:\Genesis Marketplace\config\pins.json`:

```json
"range-keeper": {
  "tokenId": "<from erc8004 show>",
  "chainId": 97,
  "serviceUrl": "<endpoint>",
  "walletAddress": "0xa17E5B37b8987DF7aACd00Fe37A64Ce9dccD0133",
  "agentId": "<agent_id>"
}
```

### 5) Or run one script

```powershell
cd "D:\Genesis Marketplace\studio\RangeKeeper"
.\deploy.ps1
```

## Local test (before/without platform)

```powershell
cd "D:\Genesis Marketplace\studio\RangeKeeper\app\agent"
bag doctor
bag dev
```

## Security

- **Do not commit** `.studio/` (gitignored).
- This is a **testnet throwaway** wallet for the 48h platform trial.
- Password lives only in `.studio/.env.local` on your machine.
