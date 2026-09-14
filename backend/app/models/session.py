from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from datetime import datetime, timezone
from backend.app.core.database import Base

class PresentationSession(Base):
    """
    FR-3: Jonli 5 daqiqalik taqdimot sessiyasi va savol-javob (Nizom 51-band).
    """
    __tablename__ = "presentation_sessions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("monitoring_cycles.id"), nullable=False, index=True)
    
    scheduled_time = Column(DateTime, nullable=False)
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    
    # 'rejalashtirilgan', 'jonli_jarayonda', 'yakunlandi', 'texnik_sababli_qayta_tiklangan'
    status = Column(String(50), default="rejalashtirilgan")
    
    slide_submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=True)
    recording_file = Column(String(500), nullable=True)
    
    # Nizom 51-band: Ishchi guruh a'zolarining savol-javob qaydlari va yozma tavsiyalari
    panel_qa_notes = Column(Text, nullable=True)
    panel_recommendations = Column(Text, nullable=True)

class VerificationEvent(Base):
    """
    Jonli sessiya davomida har 10-15 soniyada uzluksiz shaxsni tasdiqlash
    va texnik hodisalar (aloqa uzilishi) jurnali.
    """
    __tablename__ = "verification_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("presentation_sessions.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # 'liveness_check', 'continuous_face', 'multiple_faces', 'no_face', 'connection_drop', 'connection_resume'
    event_type = Column(String(50), nullable=False)
    
    # 'match', 'no_match', 'technical_event'
    result = Column(String(50), nullable=False)
    confidence = Column(Float, default=1.0)
    
    # Faqat xatolik/mos kelmaslik holatlarida dalil sifatida kadr saqlanadi (LR-3.2)
    evidence_frame_ref = Column(String(500), nullable=True)
