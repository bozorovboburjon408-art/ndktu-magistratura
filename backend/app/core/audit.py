import hashlib
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

# Genesis hash for the initial block in the audit trail
GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

def compute_hash(
    previous_hash: str,
    timestamp_iso: str,
    actor_id: Optional[int],
    action: str,
    target_type: str,
    target_id: Optional[str],
    details: Dict[str, Any]
) -> str:
    """
    Kriptografik SHA-256 zanjiri (hash-chaining).
    Audit jurnali ichidagi har qanday yozuv o'zidan oldingi yozuvning xeshini o'z ichiga oladi.
    Agar biron bir yozuv noqonuniy o'zgartirilsa, zanjir uziladi.
    """
    serialized_details = json.dumps(details, sort_keys=True, ensure_ascii=False)
    payload = f"{previous_hash}|{timestamp_iso}|{actor_id}|{action}|{target_type}|{target_id}|{serialized_details}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def record_audit(
    db: Session,
    action: str,
    target_type: str,
    actor_id: Optional[int] = None,
    target_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    from backend.app.models.audit_entry import AuditEntry
    
    if details is None:
        details = {}
        
    last_entry = db.query(AuditEntry).order_by(AuditEntry.id.desc()).first()
    prev_hash = last_entry.current_hash if last_entry else GENESIS_HASH
    now_iso = datetime.now(timezone.utc).isoformat()
    
    current_hash = compute_hash(
        previous_hash=prev_hash,
        timestamp_iso=now_iso,
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details
    )
    
    entry = AuditEntry(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=json.dumps(details, ensure_ascii=False),
        ip_address=ip_address,
        previous_hash=prev_hash,
        current_hash=current_hash,
        timestamp=now_iso
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

def verify_audit_integrity(db: Session) -> Dict[str, Any]:
    from backend.app.models.audit_entry import AuditEntry
    
    entries = db.query(AuditEntry).order_by(AuditEntry.id.asc()).all()
    if not entries:
        return {"valid": True, "count": 0, "message": "Audit jurnali bo'sh (barcha zanjirlar toza)"}
        
    expected_prev = GENESIS_HASH
    for idx, entry in enumerate(entries):
        if entry.previous_hash != expected_prev:
            return {
                "valid": False,
                "broken_at_id": entry.id,
                "reason": f"{entry.id}-raqamli yozuvda oldingi xesh mos kelmadi",
                "count": len(entries)
            }
            
        recalculated = compute_hash(
            previous_hash=entry.previous_hash,
            timestamp_iso=entry.timestamp,
            actor_id=entry.actor_id,
            action=entry.action,
            target_type=entry.target_type,
            target_id=entry.target_id,
            details=json.loads(entry.details) if entry.details else {}
        )
        if recalculated != entry.current_hash:
            return {
                "valid": False,
                "broken_at_id": entry.id,
                "reason": f"{entry.id}-raqamli yozuv ma'lumotlari soxtalashtirilgan (xesh mos emas)",
                "count": len(entries)
            }
        expected_prev = entry.current_hash
        
    return {
        "valid": True,
        "count": len(entries),
        "latest_hash": expected_prev,
        "message": "Audit zanjirining kriptografik yaxlitligi to'liq tasdiqlandi"
    }
