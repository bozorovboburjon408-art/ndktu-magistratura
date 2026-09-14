import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.models.session import PresentationSession, VerificationEvent
from backend.app.models.screening import IntegrityFlag
from backend.app.core.audit import record_audit

def create_or_get_presentation_session(
    db: Session,
    student_id: int,
    cycle_id: int,
    slide_submission_id: Optional[int] = None
) -> PresentationSession:
    sess = db.query(PresentationSession).filter(
        PresentationSession.student_id == student_id,
        PresentationSession.cycle_id == cycle_id
    ).first()
    
    if not sess:
        sess = PresentationSession(
            student_id=student_id,
            cycle_id=cycle_id,
            scheduled_time=datetime.now(timezone.utc),
            status="rejalashtirilgan",
            slide_submission_id=slide_submission_id
        )
        db.add(sess)
        db.commit()
        db.refresh(sess)
    return sess

def record_session_event(
    db: Session,
    session_id: int,
    event_type: str,
    result: str,
    confidence: float = 1.0,
    evidence_frame_ref: Optional[str] = None
) -> VerificationEvent:
    """
    FR-3.4, FR-3.5: Jonli sessiyada yuz va liveness tekshiruvlari.
    FR-3.8: Aloqa uzilishi (connection_drop) faqat texnik hodisa deb yoziladi,
    hech qachon jazo yoki intizomiy flag sifatida qaralmaydi.
    """
    event = VerificationEvent(
        session_id=session_id,
        event_type=event_type,
        result=result,
        confidence=confidence,
        evidence_frame_ref=evidence_frame_ref
    )
    db.add(event)
    
    sess = db.query(PresentationSession).filter(PresentationSession.id == session_id).first()
    
    # Begona shaxs yoki 3 marta ketma-ket mos kelmaslik (A2 stsenariysi)
    if event_type == "continuous_face" and result == "no_match":
        # Sessiya uzib qo'yilmaydi! Faqat dalillar bilan Flag ochiladi (FR-3.4, A2)
        flag = IntegrityFlag(
            student_id=sess.student_id,
            cycle_id=sess.cycle_id,
            source="live_session",
            flag_type="face_non_match",
            severity="high",
            evidence_payload=json.dumps({
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "confidence": confidence,
                "frame_ref": evidence_frame_ref or "frame_capture_fail_01.jpg"
            }, ensure_ascii=False),
            resolution="ochiq"
        )
        db.add(flag)
        
    elif event_type == "multiple_faces" and result == "no_match":
        flag = IntegrityFlag(
            student_id=sess.student_id,
            cycle_id=sess.cycle_id,
            source="live_session",
            flag_type="multiple_faces",
            severity="medium",
            evidence_payload=json.dumps({
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "description": "Kadrda bir nechta shaxs aniqlandi"
            }, ensure_ascii=False),
            resolution="ochiq"
        )
        db.add(flag)
        
    db.commit()
    db.refresh(event)
    return event
