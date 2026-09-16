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

:: 3. Check if both Backend & Frontend are already running
netstat -aon | findstr ":8000 " | findstr "LISTENING" >nul 2>nul
set B_RUNNING=%ERRORLEVEL%
netstat -aon | findstr ":5173 " | findstr "LISTENING" >nul 2>nul
set F_RUNNING=%ERRORLEVEL%

if %B_RUNNING% equ 0 if %F_RUNNING% equ 0 (
    echo [OK] Backend (port 8000) and Frontend (port 5173) are ALREADY running!
    echo Backend URL:  http://127.0.0.1:8000 (Swagger: /docs)
    echo Frontend URL: http://127.0.0.1:5173
    echo.
    echo [*] Opening AtmoGraph in your default browser...
    start http://127.0.0.1:5173
    exit /b 0
)

:: 4. Free ports 8000 and 5173 if partially stuck
echo [*] Checking and freeing ports 8000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>nul
)

:: 5. Auto-install required Python packages if missing
echo [*] Checking Python dependencies (fastapi, uvicorn)...
python -c "import fastapi, uvicorn" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [*] Installing missing Python packages...
    python -m pip install fastapi uvicorn pydantic loguru
) else (
    echo [OK] Python dependencies verified.
)

:: 6. Auto-install Frontend packages if missing
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

:: 7. Launch Backend in a separate window using working directory switch
start "AtmoGraph Backend (FastAPI)" /D "%~dp0backend" cmd /k "python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload"

:: 8. Wait 3 seconds for backend to spin up
timeout /t 3 /nobreak >nul

:: 9. Open Dashboard in default browser
start http://127.0.0.1:5173

:: 10. Launch Frontend in current window
cd /d "%~dp0frontend"
npm run dev
