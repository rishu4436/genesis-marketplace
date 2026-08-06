# RangeKeeper platform deploy helper
# Run from studio/RangeKeeper or any cwd.
$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Agent = Join-Path $Root "app\agent"
$EnvFile = Join-Path $Root ".studio\.env.local"

if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*WALLET_PASSWORD=(.+)\s*$') {
      $env:WALLET_PASSWORD = $Matches[1].Trim()
    }
  }
}

if (-not $env:WALLET_PASSWORD) {
  Write-Error "WALLET_PASSWORD missing. Set it in .studio/.env.local"
}

Set-Location $Agent

Write-Host "== platform whoami ==" -ForegroundColor Cyan
bag platform whoami
if ($LASTEXITCODE -ne 0) {
  Write-Host "Not logged in. Starting bag platform login..." -ForegroundColor Yellow
  bag platform login
  bag platform whoami
}

Write-Host "== wallet ==" -ForegroundColor Cyan
bag wallet show

Write-Host "== doctor ==" -ForegroundColor Cyan
bag doctor

Write-Host "== deploy prepare ==" -ForegroundColor Cyan
bag deploy prepare

Write-Host "== deploy agent ==" -ForegroundColor Cyan
bag deploy agent

Write-Host "== status / info ==" -ForegroundColor Cyan
bag deploy status
bag deploy info

Write-Host "Done. Next: bag erc8004 register --endpoint <url> then update config/pins.json" -ForegroundColor Green
