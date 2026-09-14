from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CriterionScoreItem(BaseModel):
    criterion_id: int
    score_value: int = Field(..., ge=0, le=5)
    comment: Optional[str] = None

class AssessorScoringBatchIn(BaseModel):
    student_id: int
    cycle_id: int
    component_name: str
    scores: List[CriterionScoreItem]
    panel_qa_notes: Optional[str] = None
    panel_recommendations: Optional[str] = None

class OverrideIn(BaseModel):
    student_id: int
    cycle_id: int
    component_name: str
    override_score: float
    justification: str = Field(..., min_length=10)

class FinalMarkOut(BaseModel):
    id: int
    student_id: int
    cycle_id: int
    rubric_version_id: int
    research_report_score: float
    live_presentation_score: float
    pedagogical_report_score: float
    slides_score: float
    publications_score: float
    calendar_plan_score: float
    academic_performance_score: float
    total_score: float
    grade_scale: int
    grade_label: str
    divergence_flag: bool
    divergence_details: Optional[str] = None
    version_number: int
    is_active: bool
    confirmed_by: Optional[int] = None
    published_at: Optional[datetime] = None
    rank_in_specialty: Optional[int] = None
    total_in_specialty: Optional[int] = None

    class Config:
        from_attributes = True

class RubricCriterionOut(BaseModel):
    id: int
    component_name: str
    criterion_number: int
    criterion_name: str
    source_clause: str
    max_score: int
    description_5: Optional[str] = None
    description_3: Optional[str] = None
    description_1: Optional[str] = None

    class Config:
        from_attributes = True
