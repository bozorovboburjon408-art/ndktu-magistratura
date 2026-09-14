import os
import hashlib
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.core.audit import record_audit
from backend.app.routes.auth import get_current_user
from backend.app.models.user import User, BiometricEnrolment, ConsentRecord
from backend.app.models.submission import Submission, Publication
from backend.app.models.calendar import CalendarPlanItem
from backend.app.models.screening import ScreeningResult, IntegrityFlag
from backend.app.models.rubric import FinalMark, ScoreEntry, RubricCriterion
from backend.app.models.cycle import MonitoringCycle
from backend.app.models.appeal import Appeal
from backend.app.schemas.submission import SubmissionOut, CalendarPlanItemIn, CalendarPlanItemOut, PublicationIn, PublicationOut
from backend.app.schemas.appeal import AppealIn, AppealOut
from backend.app.services.screening_service import process_submission_screening

router = APIRouter(prefix="/students", tags=["Talaba Xizmatlari"])

@router.get("/calendar-plan", response_model=List[CalendarPlanItemOut])
def get_calendar_plan(
    cycle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(CalendarPlanItem).filter(
        CalendarPlanItem.student_id == current_user.id,
        CalendarPlanItem.cycle_id == cycle_id
    ).all()
    return items

@router.post("/calendar-plan", response_model=CalendarPlanItemOut)
def add_calendar_plan_item(
    cycle_id: int,
    item_in: CalendarPlanItemIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = CalendarPlanItem(
        student_id=current_user.id,
        cycle_id=cycle_id,
        category=item_in.category,
        description=item_in.description,
        planned_deadline=item_in.planned_deadline,
        status="kutilmoqda"
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/my-submissions", response_model=List[SubmissionOut])
def get_my_submissions(
    cycle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submissions = db.query(Submission).filter(
        Submission.student_id == current_user.id,
        Submission.cycle_id == cycle_id
    ).order_by(Submission.version_number.desc()).all()
    return submissions

@router.post("/upload-artifact", response_model=SubmissionOut)
async def upload_artifact(
    request: Request,
    cycle_id: int = Form(...),
    artifact_type: str = Form(...),  # 'taqdimot_slayd', 'ilmiy_hisobot', 'pedagogik_hisobot'
    file: UploadFile = File(...),
    verification_method: str = Form("yuz_biometrikasi"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-2.1, FR-2.2, FR-2.3: 3 ta artefaktni yuklash, SHA-256 xeshini hisoblash,
    versiyalash va avtomatik screeningni ishga tushirish.
    """
    if artifact_type not in ["taqdimot_slayd", "ilmiy_hisobot", "pedagogik_hisobot"]:
        raise HTTPException(status_code=400, detail="Noto'g'ri artefakt turi ko'rsatildi")
        
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    contents = await file.read()
    file_size = len(contents)
    sha256_hash = hashlib.sha256(contents).hexdigest()
    
    # Oldingi versiyani tekshirish
    prev = db.query(Submission).filter(
        Submission.student_id == current_user.id,
        Submission.cycle_id == cycle_id,
        Submission.artifact_type == artifact_type
    ).order_by(Submission.version_number.desc()).first()
    
    new_version = (prev.version_number + 1) if prev else 1
    
    safe_filename = f"{current_user.id}_{cycle_id}_{artifact_type}_v{new_version}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    submission = Submission(
        student_id=current_user.id,
        cycle_id=cycle_id,
        artifact_type=artifact_type,
        file_name=file.filename,
        file_path=file_path,
        sha256_hash=sha256_hash,
        file_size_bytes=file_size,
        version_number=new_version,
        upload_ip=request.client.host if request.client else None,
        verification_method=verification_method
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    record_audit(
        db=db,
        action="ARTIFACT_UPLOADED",
        target_type="submission",
        actor_id=current_user.id,
        target_id=str(submission.id),
        details={
            "artifact_type": artifact_type,
            "version": new_version,
            "sha256": sha256_hash,
            "file_size": file_size
        }
    )
    
    # Avtomatik screeningni ishga tushirish
    process_submission_screening(db, submission.id, actor_id=current_user.id)
    
    return submission

@router.get("/screening-results/{submission_id}")
def get_screening_results(
    submission_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub or (sub.student_id != current_user.id and current_user.role not in ["kafedra_mudiri", "baholovchi", "ilmiy_rahbar"]):
        raise HTTPException(status_code=403, detail="Ko'rish huquqi mavjud emas")
        
    results = db.query(ScreeningResult).filter(ScreeningResult.submission_id == submission_id).all()
    return results

@router.get("/my-result")
def get_my_result(
    cycle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-6.1: E'lon qilingan yakuniy ball, o'rin, rubrika komponentlari va apellatsiya holati.
    """
    final_mark = db.query(FinalMark).filter(
        FinalMark.student_id == current_user.id,
        FinalMark.cycle_id == cycle_id,
        FinalMark.is_active == True
    ).first()
    
    if not final_mark:
        return {"published": False, "message": "Baholar hali e'lon qilinmagan"}
        
    cycle = db.query(MonitoringCycle).filter(MonitoringCycle.id == cycle_id).first()
    
    # Apellatsiya berish imkoniyati (72 soat)
    can_appeal = False
    remaining_appeal_hours = 0.0
    
    if final_mark.published_at:
        now = datetime.now(timezone.utc)
        # Handle offset-naive or offset-aware
        pub_at = final_mark.published_at
        if pub_at.tzinfo is None:
            pub_at = pub_at.replace(tzinfo=timezone.utc)
        diff_hours = (now - pub_at).total_seconds() / 3600.0
        if diff_hours <= settings.APPEAL_WINDOW_HOURS:
            can_appeal = True
            remaining_appeal_hours = round(settings.APPEAL_WINDOW_HOURS - diff_hours, 1)
            
    return {
        "published": True,
        "final_mark": final_mark,
        "can_appeal": can_appeal,
        "remaining_appeal_hours": remaining_appeal_hours
    }

@router.post("/file-appeal", response_model=AppealOut)
def file_appeal(
    appeal_in: AppealIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-6.4 & VMQ № 36 45^1-45^5 bandlar:
    Baho e'lon qilingandan so'ng 72 soat ichida apellatsiya arizasi topshirish.
    Tizim qat'iy 24 soatlik qaror taymerini belgilaydi.
    """
    final_mark = db.query(FinalMark).filter(FinalMark.id == appeal_in.final_mark_id).first()
    if not final_mark:
        raise HTTPException(status_code=404, detail="Baho topilmadi")
        
    now = datetime.now(timezone.utc)
    if final_mark.published_at:
        pub_at = final_mark.published_at
        if pub_at.tzinfo is None:
            pub_at = pub_at.replace(tzinfo=timezone.utc)
        elapsed_hours = (now - pub_at).total_seconds() / 3600.0
        if elapsed_hours > settings.APPEAL_WINDOW_HOURS:
            raise HTTPException(
                status_code=400,
                detail=f"Apellatsiya berish muddati (72 soat) o'tib ketgan. Baho e'lon qilinganiga {elapsed_hours:.1f} soat bo'ldi."
            )
            
    decision_deadline = now + timedelta(hours=settings.APPEAL_DECISION_HOURS)
    
    appeal = Appeal(
        student_id=current_user.id,
        cycle_id=appeal_in.cycle_id,
        final_mark_id=appeal_in.final_mark_id,
        filed_at=now,
        grounds=appeal_in.grounds,
        target_component=appeal_in.target_component,
        decision_deadline=decision_deadline,
        status="topshirildi"
    )
    db.add(appeal)
    db.commit()
    db.refresh(appeal)
    
    record_audit(
        db=db,
        action="APPEAL_FILED",
        target_type="appeal",
        actor_id=current_user.id,
        target_id=str(appeal.id),
        details={"grounds": appeal_in.grounds, "deadline": decision_deadline.isoformat()}
    )
    
    return appeal
