@echo off
title AtmoGraph - Master All-in-One Runner
cd /d "%~dp0"

echo =======================================================
echo    AtmoGraph - Master All-in-One Startup Script
echo =======================================================
echo.

:: 1. Check Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

:: 2. Check Node
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

:: 3. Free ports 8000 and 5173 if already in use by old processes
echo [*] Checking and freeing ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

:: 4. Auto-install required Python packages if missing
echo [*] Checking Python dependencies (neo4j, torch-geometric)...
python -c "import neo4j, torch_geometric" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [*] Installing missing Python packages (neo4j, torch-geometric)...
    python -m pip install neo4j torch-geometric
) else (
    echo [OK] Python dependencies verified.
)

:: 5. Auto-install Frontend packages if missing
echo [*] Checking Frontend dependencies...
if not exist "frontend\node_modules\" (
    echo [*] Installing frontend npm packages...
    cd frontend && npm install && cd ..
) else (
    echo [OK] Frontend node_modules verified.
)

echo.
echo =======================================================
echo    Starting Backend (FastAPI) and Frontend (Vite)
echo =======================================================
echo.
echo Backend URL:  http://127.0.0.1:8000 (Swagger Docs: /docs)
echo Frontend URL: http://127.0.0.1:5173
echo.

:: 6. Launch Backend in a separate window using working directory switch
start "AtmoGraph Backend (FastAPI)" /D "%~dp0backend" cmd /k "python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload"

:: 7. Wait 4 seconds for backend to spin up
timeout /t 4 /nobreak >nul

:: 8. Open Dashboard in default browser
start http://127.0.0.1:5173

:: 9. Launch Frontend in current window
cd /d "%~dp0frontend"
npm run dev
