from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    hemis_id = Column(String(50), unique=True, nullable=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    
    # Asosiy rollar: 'talaba', 'ilmiy_rahbar', 'baholovchi', 'kafedra_mudiri', 'apellatsiya', 'administrator', 'auditor'
    role = Column(String(50), nullable=False, default="talaba", index=True)
    
    # Talabalar uchun qo'shimcha ma'lumotlar
    specialty = Column(String(255), nullable=True)  # Mutaxassislik (masalan: 70610101 - Kompyuter ilmlari)
    course_year = Column(Integer, nullable=True, default=1)  # 1-kurs yoki 2-kurs
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Bog'lanishlar
    supervisor = relationship("User", remote_side=[id], backref="students")
    biometric_enrolment = relationship("BiometricEnrolment", back_populates="student", uselist=False)
    consents = relationship("ConsentRecord", back_populates="student")

class BiometricEnrolment(Base):
    """
    O‘RQ-547 talabi: Biometrik shablon shifrlangan saqlanadi.
    Surat faylining o'zi saqlanmaydi, faqat matematik shablon (template).
    """
    __tablename__ = "biometric_enrolments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    template_encrypted = Column(Text, nullable=False)  # Shifrlangan yuz matematik vektori
    enrolled_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String(50), default="active")  # 'active' yoki 'withdrawn'
    
    # Oflayn / in-person fallback yozuvi (FR-1.6, LR-1.4)
    is_in_person_fallback = Column(Boolean, default=False)
    in_person_verifier_name = Column(String(255), nullable=True)
    in_person_verified_at = Column(DateTime, nullable=True)

    student = relationship("User", back_populates="biometric_enrolment")

class ConsentRecord(Base):
    """
    O‘RQ-547 talabi: Shaxsiy va biometrik ma'lumotlarni qayta ishlash uchun alohida,
    ixtiyoriy, yozma va chaqirib olinadigan rozilik arizasi jurnali.
    """
    __tablename__ = "consent_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    consent_type = Column(String(50), nullable=False)  # 'biometric_processing', 'terms_of_service'
    consent_text_version = Column(String(50), nullable=False, default="v1.0-2026")
    is_granted = Column(Boolean, default=True)
    consented_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    withdrawn_at = Column(DateTime, nullable=True)
    ip_address = Column(String(50), nullable=True)

    student = relationship("User", back_populates="consents")
