from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SubmissionOut(BaseModel):
    id: int
    student_id: int
    cycle_id: int
    artifact_type: str
    file_name: str
    sha256_hash: str
    file_size_bytes: int
    version_number: int
    uploaded_at: datetime
    is_frozen: bool
    verification_method: str

    class Config:
        from_attributes = True

class PublicationIn(BaseModel):
    title: str
    co_authors: Optional[str] = None
    venue: str
    publication_date: Optional[str] = None
    doi_or_issn: Optional[str] = None
    publication_type: str = "maqola"
    file_url: Optional[str] = None

class PublicationOut(BaseModel):
    id: int
    student_id: int
    cycle_id: int
    title: str
    co_authors: Optional[str] = None
    venue: str
    publication_date: Optional[str] = None
    doi_or_issn: Optional[str] = None
    publication_type: str
    is_verified: bool

    class Config:
        from_attributes = True

class CalendarPlanItemIn(BaseModel):
    category: str
    description: str
    planned_deadline: datetime
    evidence_file: Optional[str] = None

class CalendarPlanItemOut(BaseModel):
    id: int
    student_id: int
    cycle_id: int
    category: str
    description: str
    planned_deadline: datetime
    completed_date: Optional[datetime] = None
    status: str
    evidence_file: Optional[str] = None
    supervisor_confirmed: bool
    supervisor_comment: Optional[str] = None

    class Config:
        from_attributes = True
