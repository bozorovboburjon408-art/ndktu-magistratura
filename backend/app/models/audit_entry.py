from sqlalchemy import Column, Integer, String, Text
from backend.app.core.database import Base

class AuditEntry(Base):
    __tablename__ = "audit_entries"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    target_type = Column(String(100), nullable=False, index=True)
    target_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=False, default="{}")
    ip_address = Column(String(50), nullable=True)
    previous_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False, index=True)
    timestamp = Column(String(50), nullable=False, index=True)
