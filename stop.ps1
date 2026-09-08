# Stop AtmoGraph Servers
Write-Host "[*] Stopping AtmoGraph Backend (8000) and Frontend (5173)..." -ForegroundColor Yellow

$ports = 8000, 5173
foreach ($p in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "[OK] Stopped process on port $p (PID $($c.OwningProcess))" -ForegroundColor Green
    }
}

Write-Host "[OK] All AtmoGraph servers stopped." -ForegroundColor Cyan
