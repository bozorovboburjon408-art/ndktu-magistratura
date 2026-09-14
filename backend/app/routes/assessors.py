from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.audit import record_audit
from backend.app.routes.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.rubric import RubricCriterion, RubricVersion, ScoreEntry, FinalMark
from backend.app.models.submission import Submission
from backend.app.models.session import PresentationSession
from backend.app.schemas.rubric import AssessorScoringBatchIn, RubricCriterionOut
from backend.app.services.scoring_engine import calculate_and_save_final_mark

router = APIRouter(prefix="/assessors", tags=["Baholovchi (Ishchi Guruh) Xizmatlari"])

@router.get("/criteria", response_model=List[RubricCriterionOut])
def get_rubric_criteria(
    course_year: int = 1,
    db: Session = Depends(get_db)
):
    """
    7 ta komponent mezonlarini (0-5 ballik shkala bilan) olish
    """
    version = db.query(RubricVersion).filter(RubricVersion.course_year == course_year).first()
    if not version:
        # Standart versiyani olish
        version = db.query(RubricVersion).first()
        
    if not version:
        return []
        
    criteria = db.query(RubricCriterion).filter(
        RubricCriterion.rubric_version_id == version.id
    ).order_by(RubricCriterion.component_name, RubricCriterion.criterion_number).all()
    return criteria

@router.get("/assigned-students")
def get_assigned_students(
    cycle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Baholovchiga biriktirilgan magistrantlar ro'yxati va ularning baholash holati.
    FR-5.6: Boshqa baholovchilarning ballari ko'rinmaydi (blind scoring).
    """
    students = db.query(User).filter(User.role == "talaba").all()
    
    result = []
    for s in students:
        my_scores_count = db.query(ScoreEntry).filter(
            ScoreEntry.student_id == s.id,
            ScoreEntry.cycle_id == cycle_id,
            ScoreEntry.assessor_id == current_user.id
        ).count()
        
        subs_count = db.query(Submission).filter(
            Submission.student_id == s.id,
            Submission.cycle_id == cycle_id
        ).count()
        
        session = db.query(PresentationSession).filter(
            PresentationSession.student_id == s.id,
            PresentationSession.cycle_id == cycle_id
        ).first()
        
        result.append({
            "student_id": s.id,
            "full_name": s.full_name,
            "specialty": s.specialty,
            "course_year": s.course_year,
            "submissions_count": subs_count,
            "session_status": session.status if session else "Kutilmoqda",
            "is_scored_by_me": my_scores_count > 0,
            "my_scores_count": my_scores_count
        })
    return result

@router.post("/submit-scores")
def submit_assessor_scores(
    batch_in: AssessorScoringBatchIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-5.1 & Annex A:
    - 0-5 ballik shkala
    - 2 yoki undan past, hamda 5 ball uchun asosli izoh (comment) kiritish MAJBURIY
    - Baholovchi ballarini topshiradi va tizim oraliq ballni hisoblaydi
    """
    if current_user.role not in ["baholovchi", "kafedra_mudiri", "administrator"]:
        raise HTTPException(status_code=403, detail="Faqat baholovchilar ball kiritishi mumkin")
        
    for item in batch_in.scores:
        if item.score_value < 0 or item.score_value > 5:
            raise HTTPException(status_code=400, detail="Ball 0 dan 5 gacha bo'lishi kerak")
            
        # Annex A qoidasi: 2 va undan past yoki 5 ball qo'yilganda izoh kiritish majburiy
        if (item.score_value <= 2 or item.score_value == 5) and (not item.comment or len(item.comment.strip()) < 5):
            crit = db.query(RubricCriterion).filter(RubricCriterion.id == item.criterion_id).first()
            c_name = crit.criterion_name if crit else f"{item.criterion_id}-mezon"
            raise HTTPException(
                status_code=400,
                detail=f"'{c_name}' uchun {item.score_value} ball qo'yildi. Nizom talabiga ko'ra (Annex A) 2 dan past yoki 5 ball uchun tushuntirish izohi kiritilishi majburiy."
            )
            
    # Mavjud yozuvlarni tozalash (agar qayta kiritayotgan bo'lsa)
    db.query(ScoreEntry).filter(
        ScoreEntry.student_id == batch_in.student_id,
        ScoreEntry.cycle_id == batch_in.cycle_id,
        ScoreEntry.assessor_id == current_user.id,
        ScoreEntry.component_name == batch_in.component_name
    ).delete()
    
    # Yangi ballarni saqlash
    for item in batch_in.scores:
        entry = ScoreEntry(
            student_id=batch_in.student_id,
            cycle_id=batch_in.cycle_id,
            assessor_id=current_user.id,
            component_name=batch_in.component_name,
            criterion_id=item.criterion_id,
            score_value=item.score_value,
            comment=item.comment
        )
        db.add(entry)
        
    # Jonli taqdimot bo'yicha savol-javob va tavsiyalarni yozib qo'yish (Nizom 51-band)
    if batch_in.component_name == "jonli_taqdimot" and (batch_in.panel_qa_notes or batch_in.panel_recommendations):
        sess = db.query(PresentationSession).filter(
            PresentationSession.student_id == batch_in.student_id,
            PresentationSession.cycle_id == batch_in.cycle_id
        ).first()
        if sess:
            if batch_in.panel_qa_notes:
                sess.panel_qa_notes = batch_in.panel_qa_notes
            if batch_in.panel_recommendations:
                sess.panel_recommendations = batch_in.panel_recommendations
            sess.status = "yakunlandi"
            db.add(sess)
            
    db.commit()
    
    rubric_v = db.query(RubricVersion).first()
    rubric_id = rubric_v.id if rubric_v else 1
    
    final_mark = calculate_and_save_final_mark(
        db=db,
        student_id=batch_in.student_id,
        cycle_id=batch_in.cycle_id,
        rubric_version_id=rubric_id,
        actor_id=current_user.id
    )
    
    return {
        "status": "muvaffaqiyatli",
        "message": "Ballar muvaffaqiyatli qabul qilindi",
        "provisional_mark": final_mark.total_score,
        "is_divergent": final_mark.divergence_flag
    }
