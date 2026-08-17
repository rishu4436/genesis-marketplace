# Resume ERC-8183 job 445 after OptimisticPolicy is re-whitelisted on BSC testnet.
# Buyer: RangeKeeper wallet 0xa17E5B37… → provider YieldRouter 0xe588cD11…
#
# Usage (from repo root):
#   powershell -File scripts/resume-job-445.ps1
#
# Requires: bag CLI, WALLET_PASSWORD in studio/RangeKeeper/.studio/.env.local

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$AgentDir = Join-Path $Root "studio\RangeKeeper\app\agent"
$EnvFile = Join-Path $Root "studio\RangeKeeper\.studio\.env.local"
$JobId = 445
$BudgetRaw = [bigint]500000000000000000  # 0.5 U (18 decimals)
$Policy = "0x4f4678d4439fec812ac7674bb3efb4c8f5fb78a6"
$Router = "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25"
$Rpc = "https://data-seed-prebsc-1-s1.binance.org:8545"

Write-Host "== Resume job $JobId ==" -ForegroundColor Cyan

if (-not (Test-Path $EnvFile)) {
  throw "Missing $EnvFile (need WALLET_PASSWORD)"
}
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    [System.Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim().Trim('"'), "Process")
  }
}
if (-not $env:WALLET_PASSWORD) { throw "WALLET_PASSWORD not set" }

# 1) Check policy whitelist
Write-Host "Checking policyWhitelist..." -ForegroundColor DarkGray
$wl = python -c @"
from web3 import Web3
w3=Web3(Web3.HTTPProvider('$Rpc'))
abi=[{'inputs':[{'name':'p','type':'address'}],'name':'policyWhitelist','outputs':[{'type':'bool'}],'stateMutability':'view','type':'function'}]
r=w3.eth.contract(address=Web3.to_checksum_address('$Router'), abi=abi)
print(r.functions.policyWhitelist(Web3.to_checksum_address('$Policy')).call())
"@
if ($wl.Trim() -ne "True") {
  Write-Host "Policy still NOT whitelisted ($wl). Aborting — try again later." -ForegroundColor Yellow
  exit 2
}
Write-Host "Policy is whitelisted." -ForegroundColor Green

# 2) register + fund via Python (bag status after)
Set-Location $AgentDir
$env:PYTHONUNBUFFERED = "1"
python -u -c @"
from bnbagent_studio_core.wallet import get_wallet
from bnbagent_studio_core.erc8183.client import get_8183_client
from bnbagent_studio_core.erc8183 import client as cl
cl.get_8183_client.cache_clear()

get_wallet()
c = get_8183_client('bsc-testnet')
jid = $JobId
raw = $BudgetRaw
print('job before', c.get_job(jid))
print('status', c.get_job_status(jid))
print('register...')
reg = c.register_job(jid)
print('register_tx', reg.get('transactionHash') if isinstance(reg, dict) else reg)
print('fund...')
fund = c.fund(jid, raw, approve_floor=raw)
print('fund_tx', fund.get('transactionHash') if isinstance(fund, dict) else fund)
print('status after', c.get_job_status(jid))
print('job after', c.get_job(jid))
"@

Write-Host ""
Write-Host "On-chain fund done. Next:" -ForegroundColor Green
Write-Host "  bag erc8183 status $JobId --network bsc-testnet"
Write-Host "  Then marketplace notify_funded (YieldRouter A2A) + fetch when SUBMITTED."
Write-Host "  Settle after 24h: bag erc8183 settle $JobId --action approve"
