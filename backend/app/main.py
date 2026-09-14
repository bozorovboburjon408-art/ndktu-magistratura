import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.database import engine, Base
import backend.app.models  # Barcha modellarni ro'yxatga olish

from backend.app.routes import (
    auth,
    students,
    assessors,
    department,
    appeals,
    audit,
    live_session
)

# Ma'lumotlar bazasi jadvallarini yaratish
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS sozlamalari (Frontend ulanishi uchun)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Saqlash kataloglarini yaratish
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
os.makedirs(settings.REPORT_DIR, exist_ok=True)

# Marshrutlarni ulash
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(students.router, prefix=settings.API_V1_STR)
app.include_router(assessors.router, prefix=settings.API_V1_STR)
app.include_router(department.router, prefix=settings.API_V1_STR)
app.include_router(appeals.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(live_session.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "faol",
        "tizim": "Magistratura Talabalarining Semestrlik Monitoringi va Baholash Platformasi",
        "hujjat": "O'zbekiston Respublikasi Vazirlar Mahkamasining 2015-yil 2-martdagi 36-son qarori",
        "versiya": settings.VERSION,
        "til": "O'zbek tili (Lotin yozuvida)"
    }
