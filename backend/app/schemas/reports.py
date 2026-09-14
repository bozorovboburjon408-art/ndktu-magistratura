from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class EvidencePackItem(BaseModel):
    artifact_type: str
    file_name: str
    sha256_hash: str
    uploaded_at: str
    screening_summary: Dict[str, Any]

class EvidencePackOut(BaseModel):
    student_id: int
    student_name: str
    specialty: str
    course_year: int
    supervisor_name: str
    cycle_title: str
    submissions: List[EvidencePackItem]
    session_summary: Optional[Dict[str, Any]] = None
    flags: List[Dict[str, Any]]
    rubric_breakdown: Dict[str, Any]
    overrides: List[Dict[str, Any]]
    final_mark: Dict[str, Any]
    appeal_history: List[Dict[str, Any]]

class ScientificCouncilReportOut(BaseModel):
    cycle_title: str
    total_students: int
    evaluated_students: int
    excellent_count: int  # A'lo (86-100)
    good_count: int       # Yaxshi (71-85)
    satisfactory_count: int  # Qoniqarli (60-70)
    unsatisfactory_count: int # Qoniqarsiz (<60)
    average_score: float
    integrity_flags_count: int
    appeals_count: int
    students_list: List[Dict[str, Any]]
