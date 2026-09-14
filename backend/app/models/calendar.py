from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from datetime import datetime, timezone
from backend.app.core.database import Base

class CalendarPlanItem(Base):
    """
    VMQ № 36 14-15 bandlari: Talabaning tasdiqlangan individual kalendar ish rejasi bandlari.
    """
    __tablename__ = "calendar_plan_items"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("monitoring_cycles.id"), nullable=False, index=True)
    
    # Toifalar: 'o‘quv-uslubiy', 'ilmiy-tadqiqot', 'ilmiy-pedagogik', 'pedagogik_amaliyot', 'dissertatsiya_tayyorlash'
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    planned_deadline = Column(DateTime, nullable=False)
    completed_date = Column(DateTime, nullable=True)
    
    # Holati: 'kutilmoqda', 'bajarildi', 'kechikkan', 'bajarilmadi'
    status = Column(String(50), default="kutilmoqda")
    evidence_file = Column(String(255), nullable=True)
    
    supervisor_confirmed = Column(Boolean, default=False)
    supervisor_confirmed_at = Column(DateTime, nullable=True)
    supervisor_comment = Column(Text, nullable=True)
