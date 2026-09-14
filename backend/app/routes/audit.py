from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.audit import record_audit, verify_audit_integrity
from backend.app.routes.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.audit_entry import AuditEntry
from backend.app.services.retention_service import execute_retention_cleanup

router = APIRouter(prefix="/audit", tags=["Audit va Xavfsizlik Jurnali"])

@router.get("/logs")
def get_audit_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["administrator", "auditor", "kafedra_mudiri"]:
        raise HTTPException(status_code=403, detail="Audit jurnalini ko'rish huquqi yo'q")
        
    entries = db.query(AuditEntry).order_by(AuditEntry.id.desc()).limit(limit).all()
    return entries

@router.get("/verify-chain")
def verify_chain(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-10.2: Kriptografik SHA-256 zanjirining buzilmaganligini tekshirish.
    """
    report = verify_audit_integrity(db)
    return report

@router.post("/run-retention-job")
def trigger_retention(
    force_days: int = 365 * 3,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    A15: Saqlash muddati o'tgan materiallarni tozalash, apellatsiyadagi ishlarni saqlab qolish.
    """
    if current_user.role not in ["administrator"]:
        raise HTTPException(status_code=403, detail="Faqat tizim administratori ishga tushirishi mumkin")
        
    res = execute_retention_cleanup(db, actor_id=current_user.id, force_expiry_days=force_days)
    return res

@router.post("/attempt-tamper")
def attempt_tamper_score_or_evidence(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    FR-10.3 & A12: Bahoni o'chirish yoki to'g'ridan-to'g'ri o'zgartirishga noqonuniy urinish.
    Tizim bu amalni qat'iy bloklaydi va xavfsizlik jurnali (audit)ga urinishni yozadi.
    """
    record_audit(
        db=db,
        action="UNAUTHORIZED_SCORE_ALTERATION_ATTEMPT",
        target_type="security_alert",
        actor_id=current_user.id,
        target_id="blocked_attempt",
        details={
            "user": current_user.username,
            "role": current_user.role,
            "alert": "Bahoni to'g'ridan-to'g'ri o'zgartirish yoki o'chirishga taqiqlangan urinish qayd etildi"
        },
        ip_address=request.client.host if request.client else None
    )
    raise HTTPException(
        status_code=403,
        detail="FR-10.3 taqiqi: Tizimda baholar yoki dalil fayllarini to'g'ridan-to'g'ri o'chirish va o'zgartirish qat'iyan man etiladi. Ushbu harakat audit jurnalida xavfsizlik ogohlantirishi sifatida qayd etildi."
    )
