import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from backend.app.core.database import get_db, SessionLocal
from backend.app.core.audit import record_audit
from backend.app.routes.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.session import PresentationSession, VerificationEvent
from backend.app.services.session_service import record_session_event

router = APIRouter(prefix="/live-session", tags=["Jonli 5 daqiqalik Taqdimot"])

# Faol WebSocket ulanishlarini boshqarish
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, session_id: int, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

    def disconnect(self, session_id: int, websocket: WebSocket):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)

    async def broadcast(self, session_id: int, message: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

@router.get("/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db)):
    sess = db.query(PresentationSession).filter(PresentationSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Sessiya topilmadi")
    events = db.query(VerificationEvent).filter(VerificationEvent.session_id == session_id).order_by(VerificationEvent.timestamp.desc()).all()
    return {
        "session": sess,
        "recent_events": events[:20]
    }

@router.post("/{session_id}/event")
def trigger_event(
    session_id: int,
    event_type: str,  # 'liveness_check', 'continuous_face', 'multiple_faces', 'connection_drop', 'connection_resume'
    result: str,      # 'match', 'no_match', 'technical_event'
    confidence: float = 1.0,
    evidence_frame_ref: Optional[str] = None,
    db: Session = Depends(get_db)
):
    event = record_session_event(
        db=db,
        session_id=session_id,
        event_type=event_type,
        result=result,
        confidence=confidence,
        evidence_frame_ref=evidence_frame_ref
    )
    return {"status": "qayd_etildi", "event_id": event.id, "event_type": event.event_type, "result": event.result}

@router.websocket("/ws/{session_id}")
async def websocket_session_endpoint(websocket: WebSocket, session_id: int):
    """
    Jonli sessiya uchun real vaqtda 5 daqiqalik taymer, slayd harakatlari
    va shaxs tekshiruvi xabarlari almashinuvi
    """
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            msg_type = payload.get("type")
            
            # Taymer, slayd yoki proctoring hodisasi
            response_payload = {
                "type": msg_type,
                "data": payload.get("data"),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await manager.broadcast(session_id, response_payload)
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
        # FR-3.8: Agar talaba uzilib qolsa, texnik hodisa sifatida qayd etiladi (jazo emas)
        db = SessionLocal()
        try:
            record_session_event(
                db=db,
                session_id=session_id,
                event_type="connection_drop",
                result="technical_event",
                confidence=1.0
            )
        finally:
            db.close()
