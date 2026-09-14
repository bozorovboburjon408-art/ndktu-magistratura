import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token, oauth2_scheme
from backend.app.core.audit import record_audit
from backend.app.models.user import User, BiometricEnrolment, ConsentRecord
from backend.app.schemas.user import UserLogin, Token, UserOut, BiometricConsentIn, BiometricEnrolIn

router = APIRouter(prefix="/auth", tags=["Autentifikatsiya va Shaxs"])

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kirish ruxsati berilmadi, token eskirgan yoki noto'g'ri"
        )
    user = db.query(User).filter(User.username == payload["sub"]).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Foydalanuvchi hisobi faol emas yoki topilmadi"
        )
    return user

@router.post("/login", response_model=Token)
def login(form_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Login yoki parol noto'g'ri kiritildi"
        )
        
    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    
    # Audit yozuvi
    record_audit(
        db=db,
        action="USER_LOGIN",
        target_type="user",
        actor_id=user.id,
        target_id=str(user.id),
        details={"username": user.username, "role": user.role},
        ip_address=request.client.host if request.client else None
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "role": user.role
    }

@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/consent")
def update_consent(
    payload: BiometricConsentIn,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    O‘RQ-547 talabi: Biometrik ma'lumotlarni qayta ishlash bo'yicha erkin rozilik berish
    yoki chaqirib olish (withdrawal).
    """
    existing_consent = db.query(ConsentRecord).filter(
        ConsentRecord.student_id == current_user.id,
        ConsentRecord.consent_type == payload.consent_type
    ).first()
    
    now = datetime.now(timezone.utc)
    if existing_consent:
        existing_consent.is_granted = payload.is_granted
        if not payload.is_granted:
            existing_consent.withdrawn_at = now
            # Agar rozilik qaytarib olinsa, biometrik shablon holatini o'chirish
            enrolment = db.query(BiometricEnrolment).filter(BiometricEnrolment.student_id == current_user.id).first()
            if enrolment:
                enrolment.status = "withdrawn"
                db.add(enrolment)
    else:
        existing_consent = ConsentRecord(
            student_id=current_user.id,
            consent_type=payload.consent_type,
            consent_text_version=payload.text_version,
            is_granted=payload.is_granted,
            consented_at=now,
            ip_address=request.client.host if request.client else None
        )
        db.add(existing_consent)
        
    db.commit()
    
    record_audit(
        db=db,
        action="CONSENT_UPDATED",
        target_type="consent",
        actor_id=current_user.id,
        target_id=str(existing_consent.id),
        details={"is_granted": payload.is_granted, "type": payload.consent_type}
    )
    
    return {
        "status": "muvaffaqiyatli",
        "is_granted": payload.is_granted,
        "xabar": "Rozilik arizasi muvaffaqiyatli qayd etildi" if payload.is_granted else "Biometrik rozilik bekor qilindi, oflayn topshirish yo'liga o'tkazildingiz"
    }

@router.post("/enrol-biometrics")
def enrol_biometrics(
    payload: BiometricEnrolIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Biometrik shablonni ro'yxatga olish yoki an'anaviy oflayn fallback yozuvi (FR-1.3, FR-1.6)
    """
    enrolment = db.query(BiometricEnrolment).filter(BiometricEnrolment.student_id == current_user.id).first()
    now = datetime.now(timezone.utc)
    
    if not enrolment:
        enrolment = BiometricEnrolment(
            student_id=current_user.id,
            template_encrypted=hashlib.sha256(payload.face_template_hash.encode()).hexdigest(),
            enrolled_at=now,
            status="active",
            is_in_person_fallback=payload.is_in_person_fallback,
            in_person_verifier_name=payload.in_person_verifier_name,
            in_person_verified_at=now if payload.is_in_person_fallback else None
        )
        db.add(enrolment)
    else:
        enrolment.template_encrypted = hashlib.sha256(payload.face_template_hash.encode()).hexdigest()
        enrolment.status = "active"
        enrolment.is_in_person_fallback = payload.is_in_person_fallback
        if payload.is_in_person_fallback:
            enrolment.in_person_verifier_name = payload.in_person_verifier_name
            enrolment.in_person_verified_at = now
            
    db.commit()
    db.refresh(enrolment)
    
    record_audit(
        db=db,
        action="BIOMETRIC_ENROLLED",
        target_type="biometric",
        actor_id=current_user.id,
        target_id=str(enrolment.id),
        details={"fallback": payload.is_in_person_fallback}
    )
    
    return {
        "status": "muvaffaqiyatli",
        "fallback": payload.is_in_person_fallback,
        "xabar": "Biometrik shablon xavfsiz ro'yxatga olindi" if not payload.is_in_person_fallback else "Oflayn shaxsni tasdiqlash yo'li rasmiylashtirildi"
    }
