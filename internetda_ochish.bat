@echo off
chcp 65001 > nul
title Magistratura Monitoring Platformasi - Internetda Ochish (Demo Tunnel)
cls
echo ===============================================================================
echo   MAGISTRATURA MONITORING VA BAHOLASH PLATFORMASI
echo   Internet orqali jonli namoyish (Demo havola) yaratish
echo ===============================================================================
echo.
echo [1/3] Backend (FastAPI) ishga tushirilmoqda...
start "Magistratura Backend" /min cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"

echo [2/3] Frontend (React+Vite) ishga tushirilmoqda...
start "Magistratura Frontend" /min cmd /k "cd frontend && npm run dev"

timeout /t 3 > nul

echo [3/3] Internet tunnel ulanmoqda (Localtunnel)...
echo.
echo -------------------------------------------------------------------------------
echo DIQQAT: Quyidagi "your url is: https://xxxx.loca.lt" ko'rinishidagi havola
echo sizning internetdagi jonli saytingiz bo'ladi!
echo Ushbu havolani xohlagan noutbuk, telefon yoki kompyuterda ochishingiz mumkin.
echo -------------------------------------------------------------------------------
echo.
echo Tunnel paroli (agar sayt ochilganda "Tunnel Password" so'rasa):
curl -s https://loca.lt/mytunnelpassword 2>nul || echo Parol shart bo'lmasligi mumkin.
echo.
echo -------------------------------------------------------------------------------
echo Havola shakllanmoqda, iltimos kuting...
echo -------------------------------------------------------------------------------
echo.

call npx localtunnel --port 5173

pause
