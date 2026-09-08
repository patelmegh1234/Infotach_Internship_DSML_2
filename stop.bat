@echo off
title Stopping AtmoGraph
echo [*] Stopping AtmoGraph Backend and Frontend...

:: Kill processes listening on port 8000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

:: Kill processes listening on port 5173 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

echo [OK] All AtmoGraph servers stopped.
timeout /t 2 /nobreak >nul
