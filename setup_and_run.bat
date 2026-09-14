@echo off
chcp 65001 > nul
title Magistratura Monitoring Platformasi - O'rnatish va Ishga Tushirish
cls
echo ===============================================================================
echo   MAGISTRATURA MONITORING VA BAHOLASH PLATFORMASI
echo   Yangi noutbukda avtomatik o'rnatish va ishga tushirish
echo ===============================================================================
echo.

echo [1/3] Python kutubxonalari tekshirilmoqda va o'rnatilmoqda...
pip install -r backend/requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo Xatolik: Python yoki pip topilmadi. Iltimos, Python 3.10+ o'rnating.
    pause
    exit /b
)

echo.
echo [2/3] Baza jadvallari va namuna ma'lumotlar yuklanmoqda...
python -m backend.seed_data

echo.
echo [3/3] Frontend paketlari o'rnatilmoqda...
cd frontend
call npm install
cd ..

echo.
echo ===============================================================================
echo   O'RNATISH MUVAFFAQIYATLI YAKUNLANDI!
echo   Tizim ishga tushirilmoqda...
echo ===============================================================================
echo.

start "Magistratura Backend (FastAPI)" cmd /k "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"
start "Magistratura Frontend (React)" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0"

echo Brauzerda quyidagi manzilni oching:
echo 👉 http://localhost:5173
echo.
pause
