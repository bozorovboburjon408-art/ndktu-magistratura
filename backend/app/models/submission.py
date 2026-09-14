from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from datetime import datetime, timezone
from backend.app.core.database import Base

class Submission(Base):
    """
    Har bir semestrda talaba yuklaydigan 3 ta asosiy artefakt:
    1) Taqdimot slayd (.pptx/.pdf)
    2) Ilmiy natijalar hisoboti (.docx/.pdf)
    3) Pedagogik hisobot (.docx/.pdf)
    """
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("monitoring_cycles.id"), nullable=False, index=True)
    
    # 'taqdimot_slayd', 'ilmiy_hisobot', 'pedagogik_hisobot'
    artifact_type = Column(String(50), nullable=False, index=True)
    
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    sha256_hash = Column(String(64), nullable=False)  # Kriptografik yaxlitlik xeshi
    file_size_bytes = Column(Integer, nullable=False)
    version_number = Column(Integer, default=1, nullable=False)
    
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    upload_ip = Column(String(50), nullable=True)
    is_frozen = Column(Boolean, default=False)  # Muddatdan so'ng muzlatiladi
    
    verification_method = Column(String(50), default="yuz_biometrikasi")  # yoki "oflayn_tasdiq"

class Publication(Base):
    """
    VMQ № 36 37 va 49-bandlari: Ilmiy maqolalar va konferensiya tezislari hisobi.
    1-kurs uchun: kamida 1 ta maqola yoki tezis
    2-kurs uchun: kamida 2 ta maqola yoki tezis
    """
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    cycle_id = Column(Integer, ForeignKey("monitoring_cycles.id"), nullable=False, index=True)
    
    title = Column(String(500), nullable=False)
    co_authors = Column(String(500), nullable=True)
    venue = Column(String(300), nullable=False)  # Jurnal yoki to'plam nomi
    publication_date = Column(String(50), nullable=True)
    doi_or_issn = Column(String(100), nullable=True)
    publication_type = Column(String(50), default="maqola")  # 'maqola' yoki 'tezis'
    file_url = Column(String(500), nullable=True)
    
    is_verified = Column(Boolean, default=False)
    verifier_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
