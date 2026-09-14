@echo off
chcp 65001 > nul
title Magistratura Monitoring Platformasi - Tarmoqda Ulashish
cls
echo ===============================================================================
echo   MAGISTRATURA MONITORING VA BAHOLASH PLATFORMASI
echo   Boshqa noutbuk yoki qurilmadan ochish bo'yicha yo'riqnoma
echo ===============================================================================
echo.
echo 1. Ikkala noutbuk bitta Wi-Fi tarmog'iga (yoki bitta lokal tarmoqqa) ulangan bo'lishi kerak.
echo.
echo 2. Ushbu noutbukning IP manzilini aniqlash:
echo -------------------------------------------------------------------------------
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    echo    >>> MAHALLIY IP MANZIL: %%a
)
echo -------------------------------------------------------------------------------
echo.
echo 3. IKKINCHI NOUTBUKNING BRAUZERIDA QUYIDAGI MANZILNI OCHING:
echo    👉 http://[USHBU_YUQORIDAGI_IP]:5173
echo.
echo    Misol uchun, agar yuqorida 192.168.1.15 bo'lsa:
echo    http://192.168.1.15:5173
echo.
echo -------------------------------------------------------------------------------
echo [4] Tizim serverlari ishga tushirilmoqda (Backend va Frontend)...
echo -------------------------------------------------------------------------------
echo.

start "Magistratura Backend (FastAPI)" cmd /k "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"
start "Magistratura Frontend (React+Vite)" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0"

echo Serverlar fonda ishga tushirildi!
echo Endi ikkinchi noutbuk brauzeriga IP manzilni kiriting.
echo.
echo (Eslatma: Agar sahifa ochilmasa, Windows Firewall / Antivirus 5173 va 8000 portlarini
echo bloklamaganligiga ishonch hosil qiling).
echo.
pause
