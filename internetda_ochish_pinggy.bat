@echo off
chcp 65001 > nul
title Magistratura Monitoring Platformasi - Internetda Ochish (Pinggy Tunnel)
cls
echo ===============================================================================
echo   MAGISTRATURA MONITORING VA BAHOLASH PLATFORMASI
echo   Internet orqali jonli havola yaratish
echo ===============================================================================
echo.
echo [1/3] Backend (FastAPI) ishga tushirilmoqda...
start "Magistratura Backend" /min cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"

echo [2/3] Frontend (React+Vite) ishga tushirilmoqda...
start "Magistratura Frontend" /min cmd /k "cd frontend && npm run dev"

timeout /t 3 > nul

echo [3/3] Bepul xavfsiz HTTPS havola olinmoqda...
echo.
echo Ekrandagi "https://xxxx.a.pinggy.link" ko'rinishidagi havolani nusxalab,
echo ikkinchi noutbuk yoki telefonda oching!
echo.
ssh -p 443 -R0:localhost:5173 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 qr@a.pinggy.io
pause
