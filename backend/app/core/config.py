import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Magistratura Talabalari Monitoringi va Baholash Platformasi"
    PROJECT_DESCRIPTION: str = "O'zbekiston Respublikasi VMQ № 36 va O'RQ-547 talablari asosidagi tizim"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Secret key for JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "magistratura_monitoring_super_secret_key_2026_uzbekistan_secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 kun
    
    # Ma'lumotlar bazasi (SQLite WAL mode by default, easily configured to PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./magistratura.db")
    
    # Fayl saqlash joyi (O'zbekiston hududidagi lokal server talabi)
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "d:/Magistratura/storage/uploads")
    EVIDENCE_DIR: str = os.getenv("EVIDENCE_DIR", "d:/Magistratura/storage/evidence")
    REPORT_DIR: str = os.getenv("REPORT_DIR", "d:/Magistratura/storage/reports")
    
    # Monitoring qoidalari va muddatlari
    APPEAL_WINDOW_HOURS: int = 72  # Talaba bahodan so'ng apellatsiya berish vaqti
    APPEAL_DECISION_HOURS: int = 24  # Apellatsiya komissiyasi qaror qabul qilish vaqti
    PRESENTATION_MAX_MINUTES: int = 5  # 5 daqiqalik jonli taqdimot
    DIVERGENCE_THRESHOLD: float = 20.0  # Baholovchilar orasidagi maksimal ruxsat etilgan farq (ball)
    
    # Saqlash muddatlari (yil)
    RETENTION_YEARS: int = 3  # VMQ 36 47-band bo'yicha dissertatsiya va materiallarni 3 yil saqlash

    class Config:
        case_sensitive = True

settings = Settings()
