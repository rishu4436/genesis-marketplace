# Redeploy the 3 live BNB free-platform agents (while trial still active).
# Usage: from repo root
#   powershell -File scripts/redeploy-platform-agents.ps1

$ErrorActionPreference = "Continue"
$env:Path = "C:\Users\rishu\.local\bin;" + $env:Path
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $PSScriptRoot "..\studio\RangeKeeper"))) {
  $Studio = Join-Path (Split-Path $PSScriptRoot -Parent) "studio"
} else {
  $Studio = Join-Path (Split-Path $PSScriptRoot -Parent) "studio"
}
# Prefer workspace-relative
$Studio = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "studio"

$agents = @("RangeKeeper", "YieldRouter", "HealthSentinel")

foreach ($name in $agents) {
  Write-Host "`n========== $name ==========" -ForegroundColor Cyan
  $proj = Join-Path $Studio $name
  $agentDir = Join-Path $proj "app\agent"
  $envFile = Join-Path $proj ".studio\.env.local"
  if (-not (Test-Path $agentDir)) {
    Write-Host "SKIP missing $proj" -ForegroundColor Yellow
    continue
  }

  Get-Content $envFile -Encoding UTF8 -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_ -match '^\s*([A-Z0-9_]+)=(.*)$') {
      [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim(), "Process")
    }
  }

  if (-not $env:WALLET_PASSWORD) {
    Write-Host "SKIP no WALLET_PASSWORD in $envFile" -ForegroundColor Yellow
    continue
  }

  Set-Location $agentDir
  if (Test-Path "Dockerfile") { Remove-Item "Dockerfile" -Force }

  bag deploy agent --accept-risk --force 2>&1 | Write-Host

  $status = bag deploy status 2>&1 | Out-String
  Write-Host $status
  $invoke = [regex]::Match($status, "https://bnbagent-api\.bnbchain\.world/v1/rt/[A-Za-z0-9]+/a2a").Value
  if ($invoke) {
    bag deploy verify --endpoint $invoke 2>&1 | Write-Host
  }
}

Write-Host "`nDone. Update config/pins.json if agent IDs changed." -ForegroundColor Green
Set-Location (Join-Path $Studio "..")
