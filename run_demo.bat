@echo off
title FlinkGuard Threat Intelligence Platform
echo ==============================================================
echo  Starting FlinkGuard Full-Stack Platform
echo  Backend: FastAPI (Port 8000)
echo  Frontend: Vite + React (Port 3000)
echo ==============================================================

echo [1/2] Launching FastAPI Inference Gateway in background...
start "FlinkGuard FastAPI Backend" cmd /k "python dns_inference_api.py"

timeout /t 2 /nobreak >nul

echo [2/2] Launching Vite React Frontend...
start "FlinkGuard React Frontend" cmd /k "npm run dev"

echo.
echo Both services are starting!
echo - API Docs:  http://127.0.0.1:8000/docs
echo - Dashboard: http://localhost:3000
echo.
pause
