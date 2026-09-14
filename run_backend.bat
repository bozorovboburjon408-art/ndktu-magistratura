@echo off
echo =========================================================================
echo Magistratura Talabalari Monitoringi va Baholash Platformasi - Backend
echo Barcha tarmoq interfeyslarida ishlamoqda: 0.0.0.0:8000
echo =========================================================================
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
