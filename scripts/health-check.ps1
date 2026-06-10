$ErrorActionPreference = "Continue"

$frontendBase = "http://127.0.0.1:5173"
$backendBase = "http://127.0.0.1:3001"

function Check-Url {
  param(
    [string]$Name,
    [string]$Url
  )
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 8
    return [pscustomobject]@{
      Name = $Name
      Url = $Url
      Ok = $true
      StatusCode = $response.StatusCode
      Detail = "OK"
    }
  } catch {
    return [pscustomobject]@{
      Name = $Name
      Url = $Url
      Ok = $false
      StatusCode = "-"
      Detail = $_.Exception.Message
    }
  }
}

function Check-Json {
  param(
    [string]$Name,
    [string]$Url
  )
  try {
    $response = Invoke-RestMethod -Uri $Url -TimeoutSec 8
    return [pscustomobject]@{
      Name = $Name
      Url = $Url
      Ok = $true
      StatusCode = "200"
      Detail = ($response | ConvertTo-Json -Depth 4 -Compress)
    }
  } catch {
    return [pscustomobject]@{
      Name = $Name
      Url = $Url
      Ok = $false
      StatusCode = "-"
      Detail = $_.Exception.Message
    }
  }
}

$checks = @(
  (Check-Url -Name "Frontend root" -Url "$frontendBase/"),
  (Check-Json -Name "Backend health" -Url "$backendBase/api/health"),
  (Check-Json -Name "Backend readiness" -Url "$backendBase/api/health/ready"),
  (Check-Url -Name "Face model manifest (/faceapi-models)" -Url "$frontendBase/faceapi-models/tiny_face_detector_model-weights_manifest.json"),
  (Check-Url -Name "Face model manifest (/models/faceapi)" -Url "$frontendBase/models/faceapi/tiny_face_detector_model-weights_manifest.json")
)

Write-Host "== STEP health checks =="
foreach ($check in $checks) {
  if ($check.Ok) {
    Write-Host "[OK ] $($check.Name) -> $($check.StatusCode)"
  } else {
    Write-Host "[ERR] $($check.Name) -> $($check.Detail)"
  }
}

$failed = $checks | Where-Object { -not $_.Ok }
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "One or more checks failed. Review .env values, backend logs, and model asset paths."
  exit 1
}

Write-Host ""
Write-Host "All checks passed."
