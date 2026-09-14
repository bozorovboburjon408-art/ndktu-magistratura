from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.submission import Submission
from backend.app.models.screening import ScreeningResult
from backend.app.models.session import PresentationSession
from backend.app.models.appeal import Appeal
from backend.app.core.audit import record_audit

def execute_retention_cleanup(db: Session, actor_id: int = None, force_expiry_days: int = 365 * 3) -> Dict[str, Any]:
    """
    A15 & LR-3.3: Saqlash muddati o'tgan ma'lumotlarni tozalash jarayoni (Retention Job).
    - Qoida: Apellatsiya jarayonida turgan (status: 'topshirildi', 'korib_chiqilmoqda')
      talabalarning hujjatlari VA materiallari TOZALANMAYDI (himoyalangan saqlanadi).
    - Boshqa muddati o'tgan fayl/sessiya yozuvlari tozalanadi va har bir o'chirish AUDITga yoziladi.
    """
    now = datetime.now(timezone.utc)
    cutoff_date = now - timedelta(days=force_expiry_days)
    
    # Apellatsiya jarayonidagi talabalarning ID lari
    active_appeals = db.query(Appeal).filter(
        Appeal.status.in_(["topshirildi", "korib_chiqilmoqda"])
    ).all()
    protected_student_ids = {a.student_id for a in active_appeals}
    
    # Muddati o'tgan va apellatsiyada bo'lmagan topshiriqlar
    expired_submissions = db.query(Submission).filter(
        Submission.uploaded_at < cutoff_date,
        ~Submission.student_id.in_(protected_student_ids)
    ).all()
    
    deleted_count = 0
    for sub in expired_submissions:
        deleted_count += 1
        # Bog'liq bo'lgan tekshiruv natijalarini tozalash va sessiya bog'lanishini ajratish
        db.query(ScreeningResult).filter(ScreeningResult.submission_id == sub.id).delete()
        db.query(PresentationSession).filter(PresentationSession.slide_submission_id == sub.id).update({"slide_submission_id": None})
        db.delete(sub)
        
    db.commit()
    
    record_audit(
        db=db,
        action="RETENTION_JOB_EXECUTED",
        target_type="system",
        actor_id=actor_id,
        target_id="scheduled_retention",
        details={
            "deleted_submissions_count": deleted_count,
            "protected_appealed_students_count": len(protected_student_ids),
            "cutoff_date": cutoff_date.isoformat(),
            "timestamp": now.isoformat()
        }
    )
    
    return {
        "status": "muvaffaqiyatli",
        "deleted_count": deleted_count,
        "protected_students_count": len(protected_student_ids),
        "message": f"Saqlash muddati o'tgan {deleted_count} ta hujjat xavfsiz tozalandi. Apellatsiyadagi {len(protected_student_ids)} ta talaba ishi himoyalab saqlandi."
    }
