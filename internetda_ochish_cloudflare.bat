@echo off
chcp 65001 > nul
title Magistratura Monitoring Platformasi - Internetda Ochish (Cloudflare Tunnel)
cls
echo ===============================================================================
echo   MAGISTRATURA MONITORING VA BAHOLASH PLATFORMASI
echo   Cloudflare Tunnel orqali bepul global HTTPS havola yaratish
echo ===============================================================================
echo.
echo [1/3] Backend (FastAPI) ishga tushirilmoqda...
start "Magistratura Backend" /min cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"

echo [2/3] Frontend (React+Vite) ishga tushirilmoqda...
start "Magistratura Frontend" /min cmd /k "cd frontend && npm run dev"

timeout /t 3 > nul

echo [3/3] Cloudflare Tunnel ishga tushirilmoqda...
echo.
echo -------------------------------------------------------------------------------
echo Oynada "https://xxxx.trycloudflare.com" ko'rinishidagi havola paydo bo'ladi.
echo Ushbu havolani xohlagan noutbuk yoki telefonda oching!
echo -------------------------------------------------------------------------------
echo.

call npx cloudflared tunnel --url http://localhost:5173

pause
