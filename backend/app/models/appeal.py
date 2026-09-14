from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime, timezone
from backend.app.core.database import Base

class Appeal(Base):
    """
    VMQ № 36 45^1–45^5 bandlari:
    - Baho e'lon qilingandan so'ng 72 soat ichida talaba apellatsiya beradi.
    - Apellatsiya komissiyasi 24 soat ichida ko'rib chiqib qaror qabul qiladi.
    - Qaror nusxasi talabaga o'sha kunning o'zida yuboriladi.
    """
    __tablename__ = "appeals"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("monitoring_cycles.id"), nullable=False, index=True)
    final_mark_id = Column(Integer, ForeignKey("final_marks.id"), nullable=False)
    
    filed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    grounds = Column(Text, nullable=False)  # E'tiroz asosi va dalillari
    target_component = Column(String(100), nullable=True)  # Qaysi rubrika komponenti bo'yicha
    
    decision_deadline = Column(DateTime, nullable=False)  # filed_at + 24 soat
    
    # 'topshirildi', 'korib_chiqilmoqda', 'qanoatlantirildi', 'rad_etildi'
    status = Column(String(50), default="topshirildi", index=True)
    
    commission_members = Column(String(500), nullable=True)  # Komissiya a'zolari tarkibi
    commission_decision_notes = Column(Text, nullable=True)  # Qaror bayonnomasi matni
    decided_at = Column(DateTime, nullable=True)
    
    resulting_mark_id = Column(Integer, ForeignKey("final_marks.id"), nullable=True)
