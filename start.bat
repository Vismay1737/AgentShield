@echo off
echo ========================================================
echo       AgentShield - The AI Immune System Launcher
echo ========================================================
echo.

echo [1/2] Starting AgentShield Backend (FastAPI on http://127.0.0.1:8000)...
start "AgentShield Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Starting AgentShield Frontend (Next.js on http://localhost:3000)...
start "AgentShield Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo Both services launched!
echo Open your browser at: http://localhost:3000
echo Backend API Docs at: http://127.0.0.1:8000/docs
echo ========================================================
pause
