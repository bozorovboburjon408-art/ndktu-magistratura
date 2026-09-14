from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone
from backend.app.core.database import Base

class MonitoringCycle(Base):
    __tablename__ = "monitoring_cycles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    academic_year = Column(String(50), nullable=False)  # "2025-2026"
    semester = Column(Integer, nullable=False)  # 1 yoki 2
    
    # Holat mashinasi (State Machine)
    # CYCLE_OPEN -> SUBMISSION_OPEN -> SUBMITTED -> SCREENING -> SCREENED ->
    # SUPERVISOR_REVIEWED -> SESSION_SCHEDULED -> SESSION_COMPLETE ->
    # SCORING -> SCORED -> CONFIRMED -> PUBLISHED -> APPEAL_OPEN -> APPEAL_CLOSED -> CYCLE_CLOSED
    state = Column(String(50), nullable=False, default="CYCLE_OPEN", index=True)
    
    submission_deadline = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    appeal_deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime, nullable=True)
