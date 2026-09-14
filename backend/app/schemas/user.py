from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    full_name: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[EmailStr] = None
    role: str = "talaba"
    specialty: Optional[str] = None
    course_year: Optional[int] = 1
    hemis_id: Optional[str] = None
    supervisor_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: Optional[str] = None
    role: str
    specialty: Optional[str] = None
    course_year: Optional[int] = None
    hemis_id: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class BiometricConsentIn(BaseModel):
    is_granted: bool
    consent_type: str = "biometric_processing"
    text_version: str = "v1.0-2026"

class BiometricEnrolIn(BaseModel):
    face_template_hash: str
    is_in_person_fallback: bool = False
    in_person_verifier_name: Optional[str] = None
