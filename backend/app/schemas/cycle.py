from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CycleCreate(BaseModel):
    title: str
    academic_year: str
    semester: int
    submission_deadline: Optional[datetime] = None

class CycleOut(BaseModel):
    id: int
    title: str
    academic_year: str
    semester: int
    state: str
    submission_deadline: Optional[datetime] = None
    published_at: Optional[datetime] = None
    appeal_deadline: Optional[datetime] = None
    created_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CycleStateUpdate(BaseModel):
    state: str
