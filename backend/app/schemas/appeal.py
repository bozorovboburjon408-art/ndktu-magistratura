from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime

class AppealIn(BaseModel):
    cycle_id: int
    final_mark_id: int
    grounds: str = Field(..., min_length=15)
    target_component: Optional[str] = None

class AppealDecisionIn(BaseModel):
    decision: str  # 'qanoatlantirildi' yoki 'rad_etildi'
    commission_members: str
    commission_decision_notes: str = Field(..., min_length=10)
    adjusted_scores: Optional[Dict[str, float]] = None  # Yangi ballar agar qanoatlantirilsa

class AppealOut(BaseModel):
    id: int
    student_id: int
    cycle_id: int
    final_mark_id: int
    filed_at: datetime
    grounds: str
    target_component: Optional[str] = None
    decision_deadline: datetime
    status: str
    commission_members: Optional[str] = None
    commission_decision_notes: Optional[str] = None
    decided_at: Optional[datetime] = None
    resulting_mark_id: Optional[int] = None

    class Config:
        from_attributes = True
