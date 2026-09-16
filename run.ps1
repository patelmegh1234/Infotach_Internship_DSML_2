# AtmoGraph - Master Startup Script (PowerShell)
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { (Get-Location).Path }
if (Test-Path "$ScriptDir\atmograph") { $ScriptDir = Join-Path $ScriptDir "atmograph" }
Set-Location $ScriptDir

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   AtmoGraph - Master All-in-One Startup Script       " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Python
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python is not installed or not found in PATH." -ForegroundColor Red
    exit 1
}

# 2. Check Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed or not found in PATH." -ForegroundColor Red
    exit 1
}

# 3. Check if both Backend & Frontend are already running
$bConn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$fConn = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue

if ($bConn -and $fConn) {
    Write-Host "[OK] Backend (port 8000) and Frontend (port 5173) are ALREADY running!" -ForegroundColor Green
    Write-Host "Backend URL:  http://127.0.0.1:8000 (Swagger: /docs)" -ForegroundColor Gray
    Write-Host "Frontend URL: http://127.0.0.1:5173" -ForegroundColor Gray
    Write-Host ""
    Write-Host "[*] Opening AtmoGraph in default browser..." -ForegroundColor Yellow
    Start-Process "http://127.0.0.1:5173"
    exit 0
}

# 4. Free ports 8000 and 5173 if partially occupied
$ports = 8000, 5173
foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "[*] Freeing port $p (PID: $($conn.OwningProcess))..." -ForegroundColor Yellow
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# 5. Check Python dependencies
Write-Host "[*] Checking Python dependencies (fastapi, uvicorn)..." -ForegroundColor Yellow
$pyCheck = python -c "import fastapi, uvicorn" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[*] Installing missing Python packages..." -ForegroundColor Yellow
    python -m pip install fastapi uvicorn pydantic loguru
} else {
    Write-Host "[OK] Python dependencies ready." -ForegroundColor Green
}

# 6. Check Frontend dependencies
Write-Host "[*] Checking Frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "$ScriptDir\frontend\node_modules")) {
    Write-Host "[*] Installing npm packages in frontend..." -ForegroundColor Yellow
    Push-Location "$ScriptDir\frontend"
    npm install
    Pop-Location
} else {
    Write-Host "[OK] Frontend node_modules ready." -ForegroundColor Green
}

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   Launching Backend & Frontend Servers               " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend URL:  http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/docs)" -ForegroundColor Gray
Write-Host "Frontend URL: http://127.0.0.1:5173" -ForegroundColor Gray
Write-Host ""

# 7. Start Backend in separate process window
Start-Process powershell -WorkingDirectory "$ScriptDir\backend" -ArgumentList "-NoExit", "-Command", "python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload"

# 8. Wait 3 seconds for backend to initialize
Start-Sleep -Seconds 3

# 9. Open Browser
Start-Process "http://127.0.0.1:5173"

# 10. Start Frontend in current console
Set-Location "$ScriptDir\frontend"
npm run dev
