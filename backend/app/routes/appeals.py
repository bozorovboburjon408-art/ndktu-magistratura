from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.audit import record_audit
from backend.app.routes.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.appeal import Appeal
from backend.app.models.rubric import FinalMark
from backend.app.schemas.appeal import AppealDecisionIn, AppealOut
from backend.app.services.report_generator import build_student_evidence_pack_data
from backend.app.services.scoring_engine import calculate_grade, recalculate_specialty_rankings

router = APIRouter(prefix="/appeals", tags=["Apellatsiya Komissiyasi"])

@router.get("/list")
def list_appeals(
    cycle_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Appeal)
    if cycle_id:
        query = query.filter(Appeal.cycle_id == cycle_id)
        
    appeals = query.order_by(Appeal.filed_at.desc()).all()
    now = datetime.now(timezone.utc)
    
    result = []
    for a in appeals:
        student = db.query(User).filter(User.id == a.student_id).first()
        deadline = a.decision_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
            
        remaining_hours = max(0.0, round((deadline - now).total_seconds() / 3600.0, 1))
        
        result.append({
            "id": a.id,
            "student_id": a.student_id,
            "student_name": student.full_name if student else "Noma'lum",
            "cycle_id": a.cycle_id,
            "final_mark_id": a.final_mark_id,
            "filed_at": a.filed_at.isoformat(),
            "grounds": a.grounds,
            "target_component": a.target_component,
            "decision_deadline": a.decision_deadline.isoformat(),
            "remaining_hours": remaining_hours,
            "status": a.status,
            "commission_members": a.commission_members,
            "commission_decision_notes": a.commission_decision_notes,
            "decided_at": a.decided_at.isoformat() if a.decided_at else None,
            "resulting_mark_id": a.resulting_mark_id
        })
    return result

@router.get("/evidence-pack-data/{student_id}")
def get_appeal_evidence_pack(
    student_id: int,
    cycle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-6.4: Apellatsiya komissiyasi a'zolari uchun to'liq Dalillar to'plami ma'lumotlari
    """
    data = build_student_evidence_pack_data(db, student_id, cycle_id)
    return data

@router.post("/resolve")
def resolve_appeal(
    appeal_in: AppealDecisionIn,
    appeal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-6.5 & A11: Apellatsiya komissiyasi qarori.
    - Agar qaror 'qanoatlantirildi' bo'lsa:
      Yangi baho versiyasi hosil qilinadi, asl baho ham tarixda saqlanadi, reyting qayta hisoblanadi.
    """
    appeal = db.query(Appeal).filter(Appeal.id == appeal_id).first()
    if not appeal:
        raise HTTPException(status_code=404, detail="Apellatsiya topilmadi")
        
    now = datetime.now(timezone.utc)
    old_final_mark = db.query(FinalMark).filter(FinalMark.id == appeal.final_mark_id).first()
    
    appeal.commission_members = appeal_in.commission_members
    appeal.commission_decision_notes = appeal_in.commission_decision_notes
    appeal.decided_at = now
    appeal.status = appeal_in.decision
    
    new_mark_id = None
    if appeal_in.decision == "qanoatlantirildi" and old_final_mark:
        # A11: Yangi baho versiyasi yaratiladi, eski baho o'chirilmaydi
        old_final_mark.is_active = False
        db.add(old_final_mark)
        
        # Yangilangan ballarni hisoblash
        adjusted = appeal_in.adjusted_scores or {}
        new_res = adjusted.get("research_report_score", old_final_mark.research_report_score)
        new_pres = adjusted.get("live_presentation_score", old_final_mark.live_presentation_score)
        new_ped = adjusted.get("pedagogical_report_score", old_final_mark.pedagogical_report_score)
        new_slides = adjusted.get("slides_score", old_final_mark.slides_score)
        new_pub = adjusted.get("publications_score", old_final_mark.publications_score)
        new_plan = adjusted.get("calendar_plan_score", old_final_mark.calendar_plan_score)
        new_gpa = adjusted.get("academic_performance_score", old_final_mark.academic_performance_score)
        
        new_total = round(new_res + new_pres + new_ped + new_slides + new_pub + new_plan + new_gpa, 1)
        new_scale, new_label = calculate_grade(new_total)
        
        new_final_mark = FinalMark(
            student_id=appeal.student_id,
            cycle_id=appeal.cycle_id,
            rubric_version_id=old_final_mark.rubric_version_id,
            research_report_score=new_res,
            live_presentation_score=new_pres,
            pedagogical_report_score=new_ped,
            slides_score=new_slides,
            publications_score=new_pub,
            calendar_plan_score=new_plan,
            academic_performance_score=new_gpa,
            total_score=new_total,
            grade_scale=new_scale,
            grade_label=new_label,
            version_number=old_final_mark.version_number + 1,
            is_active=True,
            confirmed_by=current_user.id,
            confirmed_at=now,
            published_at=now
        )
        db.add(new_final_mark)
        db.commit()
        db.refresh(new_final_mark)
        
        new_mark_id = new_final_mark.id
        appeal.resulting_mark_id = new_mark_id
        
        # Reytingni qayta hisoblash
        recalculate_specialty_rankings(db, appeal.cycle_id)
        
    db.commit()
    db.refresh(appeal)
    
    record_audit(
        db=db,
        action="APPEAL_RESOLVED",
        target_type="appeal",
        actor_id=current_user.id,
        target_id=str(appeal.id),
        details={
            "decision": appeal_in.decision,
            "resulting_mark_id": new_mark_id,
            "notes": appeal_in.commission_decision_notes
        }
    )
    
    return {
        "status": "muvaffaqiyatli",
        "decision": appeal.status,
        "resulting_mark_id": new_mark_id,
        "message": "Apellatsiya komissiyasi qarori muvaffaqiyatli qayd etildi"
    }
