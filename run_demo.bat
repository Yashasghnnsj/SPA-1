@echo off
title FlinkGuard Real-Time Threat Pipeline
cd /d "%~dp0"

echo ==============================================================
echo  Starting FlinkGuard
echo  Web UI:       http://localhost:3000
echo  FastAPI:      http://localhost:8000/docs
echo  Apache Flink: http://localhost:8081
echo ==============================================================
echo.
echo This starts the Kafka, FastAPI, Apache Flink, and web containers.
echo Configure EVENT_API_URL and API_SECRET in .env to enable API polling.
echo Press Ctrl+C to stop the stack.
echo.

docker compose up --build
if errorlevel 1 (
    echo.
    echo Startup failed. Verify Docker Desktop is running and Docker Compose v2 is installed.
    pause
)
