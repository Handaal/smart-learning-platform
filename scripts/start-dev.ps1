param(
  [switch]$SkipDocker,
  [switch]$NoInstall
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

function Ensure-EnvFile {
  param(
    [string]$Path,
    [string]$ExamplePath
  )

  if (Test-Path $Path) { return }
  if (Test-Path $ExamplePath) {
    Copy-Item -Path $ExamplePath -Destination $Path
    Write-Host "Created env file from template: $Path"
    return
  }
  Write-Warning "Missing env file and template: $Path"
}

Write-Host "== STEP local startup =="
Ensure-EnvFile -Path (Join-Path $backendDir ".env") -ExamplePath (Join-Path $backendDir ".env.example")
Ensure-EnvFile -Path (Join-Path $frontendDir ".env") -ExamplePath (Join-Path $frontendDir ".env.example")

if (-not $SkipDocker) {
  Write-Host "Starting infrastructure containers (db, redis)..."
  docker compose up db redis -d | Out-Host
}

if (-not $NoInstall) {
  Write-Host "Installing backend dependencies..."
  Push-Location $backendDir
  npm install | Out-Host
  Pop-Location

  Write-Host "Installing frontend dependencies..."
  Push-Location $frontendDir
  npm install | Out-Host
  Pop-Location
}

Write-Host "Starting backend dev server..."
Start-Process -FilePath "powershell" -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$backendDir'; npm run dev"
)

Write-Host "Starting frontend dev server..."
Start-Process -FilePath "powershell" -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$frontendDir'; npm run dev"
)

Write-Host ""
Write-Host "Services launching..."
Write-Host "Frontend: http://127.0.0.1:5173"
Write-Host "Backend health: http://127.0.0.1:3001/api/health"
Write-Host "Backend readiness: http://127.0.0.1:3001/api/health/ready"
Write-Host ""
Write-Host "Run health checks with:"
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/health-check.ps1"
