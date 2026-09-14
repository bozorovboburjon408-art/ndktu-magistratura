from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.audit import record_audit
from backend.app.routes.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.cycle import MonitoringCycle
from backend.app.models.rubric import FinalMark, ScoreOverride, RubricVersion
from backend.app.models.screening import IntegrityFlag
from backend.app.schemas.rubric import OverrideIn, FinalMarkOut
from backend.app.services.scoring_engine import calculate_and_save_final_mark
from backend.app.services.report_generator import generate_scientific_council_excel, generate_evidence_pack_pdf

router = APIRouter(prefix="/department", tags=["Magistratura Bo'limi Boshlig'i"])

@router.get("/cycles")
def get_cycles(db: Session = Depends(get_db)):
    return db.query(MonitoringCycle).all()

@router.post("/cycle-state")
def update_cycle_state(
    cycle_id: int,
    new_state: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["kafedra_mudiri", "administrator"]:
        raise HTTPException(status_code=403, detail="Ruxsat etilmagan amal")
        
    cycle = db.query(MonitoringCycle).filter(MonitoringCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Monitoring tsikli topilmadi")
        
    prev_state = cycle.state
    cycle.state = new_state
    db.commit()
    
    record_audit(
        db=db,
        action="CYCLE_STATE_TRANSITION",
        target_type="cycle",
        actor_id=current_user.id,
        target_id=str(cycle.id),
        details={"previous_state": prev_state, "new_state": new_state}
    )
    return {"status": "muvaffaqiyatli", "cycle_id": cycle.id, "state": new_state}

@router.get("/cohort-summary")
def get_cohort_summary(
    cycle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["kafedra_mudiri", "administrator", "auditor", "baholovchi"]:
        raise HTTPException(status_code=403, detail="Ruxsat berilmadi")
        
    students = db.query(User).filter(User.role == "talaba").all()
    
    summary = []
    for s in students:
        mark = db.query(FinalMark).filter(
            FinalMark.student_id == s.id,
            FinalMark.cycle_id == cycle_id,
            FinalMark.is_active == True
        ).first()
        
        flags_count = db.query(IntegrityFlag).filter(
            IntegrityFlag.student_id == s.id,
            IntegrityFlag.cycle_id == cycle_id
        ).count()
        
        summary.append({
            "student_id": s.id,
            "full_name": s.full_name,
            "hemis_id": s.hemis_id,
            "specialty": s.specialty,
            "course_year": s.course_year,
            "total_score": mark.total_score if mark else None,
            "grade_scale": mark.grade_scale if mark else None,
            "grade_label": mark.grade_label if mark else "Kutilmoqda",
            "divergence_flag": mark.divergence_flag if mark else False,
            "divergence_details": mark.divergence_details if mark else None,
            "flags_count": flags_count,
            "rank": mark.rank_in_specialty if mark else None,
            "is_confirmed": mark.confirmed_at is not None if mark else False,
            "is_published": mark.published_at is not None if mark else False
        })
    return summary

@router.get("/divergent-cases")
def get_divergent_cases(
    cycle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    A8: Baholovchilar orasida 20 balldan ortiq og'ish (divergence > 20) bo'lgan holatlar
    """
    marks = db.query(FinalMark).filter(
        FinalMark.cycle_id == cycle_id,
        FinalMark.is_active == True,
        FinalMark.divergence_flag == True
    ).all()
    
    result = []
    for m in marks:
        student = db.query(User).filter(User.id == m.student_id).first()
        result.append({
            "final_mark_id": m.id,
            "student_id": m.student_id,
            "student_name": student.full_name if student else "Noma'lum",
            "total_score": m.total_score,
            "divergence_details": m.divergence_details
        })
    return result

@router.post("/override-score")
def override_score(
    override_in: OverrideIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-5.5 & A9: Bahoni tahrirlash (Override).
    Faqat kafedra mudiri / bo'lim boshlig'i tomonidan yozma asos bilan qabul qilinadi.
    Dalillar to'plamida (Evidence Pack) va auditda qayd etiladi.
    """
    if current_user.role not in ["kafedra_mudiri"]:
        raise HTTPException(status_code=403, detail="Faqat Magistratura bo'limi boshlig'i bahoni tahrirlash huquqiga ega")
        
    if not override_in.justification or len(override_in.justification.strip()) < 10:
        raise HTTPException(status_code=400, detail="Bahoni o'zgartirish uchun batafsil yozma asos kiritish majburiy")
        
    final_mark = db.query(FinalMark).filter(
        FinalMark.student_id == override_in.student_id,
        FinalMark.cycle_id == override_in.cycle_id,
        FinalMark.is_active == True
    ).first()
    
    orig_score = getattr(final_mark, override_in.component_name, 0.0) if final_mark else 0.0
    
    override = ScoreOverride(
        student_id=override_in.student_id,
        cycle_id=override_in.cycle_id,
        component_name=override_in.component_name,
        original_score=orig_score,
        override_score=override_in.override_score,
        overriding_user_id=current_user.id,
        justification=override_in.justification
    )
    db.add(override)
    db.commit()
    
    # Yangi bahoni hisoblash
    rubric_v = db.query(RubricVersion).first()
    rubric_id = rubric_v.id if rubric_v else 1
    new_final_mark = calculate_and_save_final_mark(
        db=db,
        student_id=override_in.student_id,
        cycle_id=override_in.cycle_id,
        rubric_version_id=rubric_id,
        actor_id=current_user.id
    )
    
    record_audit(
        db=db,
        action="SCORE_OVERRIDE",
        target_type="final_mark",
        actor_id=current_user.id,
        target_id=str(new_final_mark.id),
        details={
            "student_id": override_in.student_id,
            "component": override_in.component_name,
            "original_score": orig_score,
            "override_score": override_in.override_score,
            "justification": override_in.justification
        }
    )
    
    return {
        "status": "muvaffaqiyatli",
        "message": "Baho muvaffaqiyatli tahrirlandi va auditga yozildi",
        "new_total": new_final_mark.total_score,
        "new_grade": new_final_mark.grade_label
    }

@router.post("/publish-marks")
def publish_marks(
    cycle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-6.1: Baholarni tasdiqlash va e'lon qilish.
    A10 talabiga ko'ra 72 soatlik apellatsiya oynasi ishga tushadi.
    """
    if current_user.role not in ["kafedra_mudiri"]:
        raise HTTPException(status_code=403, detail="Faqat bo'lim boshlig'i baholarni e'lon qila oladi")
        
    now = datetime.now(timezone.utc)
    cycle = db.query(MonitoringCycle).filter(MonitoringCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Tsikl topilmadi")
        
    cycle.state = "PUBLISHED"
    cycle.published_at = now
    
    marks = db.query(FinalMark).filter(
        FinalMark.cycle_id == cycle_id,
        FinalMark.is_active == True
    ).all()
    
    for m in marks:
        m.confirmed_by = current_user.id
        m.confirmed_at = now
        m.published_at = now
        db.add(m)
        
    db.commit()
    
    record_audit(
        db=db,
        action="MARKS_PUBLISHED",
        target_type="cycle",
        actor_id=current_user.id,
        target_id=str(cycle_id),
        details={"published_count": len(marks), "timestamp": now.isoformat()}
    )
    
    return {
        "status": "muvaffaqiyatli",
        "published_count": len(marks),
        "message": "Baholar rasman e'lon qilindi. Talabalarga 72 soatlik apellatsiya oynasi ochildi."
    }

@router.get("/export-council-report")
def export_council_report(
    cycle_id: int,
    db: Session = Depends(get_db)
):
    """
    FR-7.3, FR-7.4 & A13: Ilmiy Kengash hisobotini Excel (XLSX) formatida yuklash.
    """
    excel_bytes = generate_scientific_council_excel(db, cycle_id)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Ilmiy_Kengash_Monitoring_Hisoboti_Tsikl_{cycle_id}.xlsx"}
    )

@router.get("/evidence-pack/{student_id}")
def download_evidence_pack(
    student_id: int,
    cycle_id: int,
    db: Session = Depends(get_db)
):
    """
    FR-7.1, FR-7.4: Talabaning Dalillar To'plami (Evidence Pack) PDF hujjati.
    """
    pdf_bytes = generate_evidence_pack_pdf(db, student_id, cycle_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Dalillar_Toplami_Talaba_{student_id}.pdf"}
    )
