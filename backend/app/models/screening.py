from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from datetime import datetime, timezone
from backend.app.core.database import Base

class ScreeningResult(Base):
    """
    Avtomatlashtirilgan dastlabki tekshiruv natijalari:
    - Nizom 26-33 bandlar: format va struktura mosligi checklisti
    - Matn o'xshashligi (antiplagiat) foizi
    - AI-generatsiya indikatori
    DIQQAT: Ushbu tekshiruvlar bahoni avtomatik kamaytirmaydi!
    """
    __tablename__ = "screening_results"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False, index=True)
    check_type = Column(String(50), nullable=False)  # 'format_compliance', 'similarity', 'ai_content'
    raw_score = Column(Float, nullable=False)
    
    # 'green' (xavfsiz <=15%), 'amber' (diqqat 15-30%), 'red' (yuqori xavf >30%)
    threshold_band = Column(String(20), default="green")
    
    details_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class IntegrityFlag(Base):
    """
    Akademik halollik va sessiya signallari (Flags):
    Har qanday shubhali holat faqat inson (mas'ul xodim yoki komissiya)
    tomonidan ko'rib chiqiladi va talabaga o'zini oqlash imkoniyati beriladi.
    """
    __tablename__ = "integrity_flags"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("monitoring_cycles.id"), nullable=False, index=True)
    
    source = Column(String(50), nullable=False)  # 'screening' yoki 'live_session'
    flag_type = Column(String(50), nullable=False)  # 'similarity_warning', 'ai_suspected', 'face_non_match', 'multiple_faces'
    severity = Column(String(20), default="medium")  # 'low', 'medium', 'high'
    
    evidence_payload = Column(Text, nullable=False)  # Qayd etilgan dalillar (vaqt, lavha, matn parchalari)
    student_response = Column(Text, nullable=True)  # Talabaning tushuntirish xati / e'tirozi
    
    # Holati: 'ochiq', 'asossiz_deb_topildi', 'tavsiya_berildi', 'ishchi_guruhga_yuborildi'
    resolution = Column(String(50), default="ochiq")
    resolver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
