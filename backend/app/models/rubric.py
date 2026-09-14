from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from datetime import datetime, timezone
from backend.app.core.database import Base

class RubricVersion(Base):
    """
    FR-5.2: Rubrika versiyalari. Har qanday baho qaysi rubrika versiyasi amal qilgan
    vaqtda qo'yilgan bo'lsa, o'sha versiya bilan bir umr o'zgarmas bog'langan bo'ladi.
    """
    __tablename__ = "rubric_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_code = Column(String(50), unique=True, nullable=False)  # "v1.0-2026-sem2"
    academic_year = Column(String(50), nullable=False)
    course_year = Column(Integer, nullable=False)  # 1 yoki 2
    specialty = Column(String(255), nullable=True)  # Bo'sh bo'lsa barchaga umumiy
    config_json = Column(Text, nullable=False)  # Komponentlar og'irliklari va mezonlar
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class RubricCriterion(Base):
    __tablename__ = "rubric_criteria"

    id = Column(Integer, primary_key=True, index=True)
    rubric_version_id = Column(Integer, ForeignKey("rubric_versions.id"), nullable=False)
    component_name = Column(String(100), nullable=False)  # 'ilmiy_hisobot', 'jonli_taqdimot', 'pedagogik_hisobot', 'taqdimot_slaydlari'
    criterion_number = Column(Integer, nullable=False)
    criterion_name = Column(String(500), nullable=False)
    source_clause = Column(String(100), nullable=False)  # "VMQ 44-band", "VMQ 26-33"
    max_score = Column(Integer, default=5)
    description_5 = Column(Text, nullable=True)  # A'lo
    description_3 = Column(Text, nullable=True)  # Qoniqarli
    description_1 = Column(Text, nullable=True)  # Minimal

class ScoreEntry(Base):
    """
    Ishchi guruh a'zosi (Baholovchi) tomonidan qo'yilgan ballar.
    FR-5.6: Barcha baholovchilar o'z ballarini topshirmaguncha, bir-birlarining ballarini ko'rmaydi (blind scoring).
    Annex A: 2 yoki undan past, hamda 5 ball uchun izoh kiritish majburiy.
    """
    __tablename__ = "score_entries"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("monitoring_cycles.id"), nullable=False, index=True)
    assessor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    component_name = Column(String(100), nullable=False)
    criterion_id = Column(Integer, ForeignKey("rubric_criteria.id"), nullable=False)
    
    score_value = Column(Integer, nullable=False)  # 0 dan 5 gacha
    comment = Column(Text, nullable=True)  # <=2 yoki ==5 bo'lganda majburiy
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ScoreOverride(Base):
    """
    FR-5.5: Bahoni tahrirlash (override). Faqat Magistratura bo'limi boshlig'i tomonidan
    asosli yozma izoh bilan amalga oshiriladi va auditda qayd etiladi.
    """
    __tablename__ = "score_overrides"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("monitoring_cycles.id"), nullable=False, index=True)
    component_name = Column(String(100), nullable=False)
    original_score = Column(Float, nullable=False)
    override_score = Column(Float, nullable=False)
    overriding_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    justification = Column(Text, nullable=False)  # Majburiy yozma asos
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class FinalMark(Base):
    """
    Yakuniy hisoblangan va tasdiqlangan baho (100 ballik tizim).
    A11 mezoniga binoan apellatsiya qanoatlantirilsa yangi versiya yaratiladi.
    """
    __tablename__ = "final_marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("monitoring_cycles.id"), nullable=False, index=True)
    rubric_version_id = Column(Integer, ForeignKey("rubric_versions.id"), nullable=False)
    
    # 7 ta komponent ballari:
    research_report_score = Column(Float, nullable=False, default=0.0)  # max 30
    live_presentation_score = Column(Float, nullable=False, default=0.0)  # max 20
    pedagogical_report_score = Column(Float, nullable=False, default=0.0)  # max 15
    slides_score = Column(Float, nullable=False, default=0.0)  # max 10
    publications_score = Column(Float, nullable=False, default=0.0)  # max 10
    calendar_plan_score = Column(Float, nullable=False, default=0.0)  # max 10
    academic_performance_score = Column(Float, nullable=False, default=0.0)  # max 5
    
    total_score = Column(Float, nullable=False, default=0.0)  # 0.0 - 100.0
    grade_scale = Column(Integer, nullable=False, default=2)  # 5, 4, 3, 2
    grade_label = Column(String(50), nullable=False, default="Qoniqarsiz")
    
    # 20 balldan ortiq og'ish holati bayrog'i (FR-5.3)
    divergence_flag = Column(Boolean, default=False)
    divergence_details = Column(Text, nullable=True)
    
    version_number = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True)  # Joriy kuchdagi baho
    
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    
    rank_in_specialty = Column(Integer, nullable=True)
    total_in_specialty = Column(Integer, nullable=True)
