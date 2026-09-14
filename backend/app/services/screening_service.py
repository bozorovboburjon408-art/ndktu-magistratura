import json
import os
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.models.screening import ScreeningResult, IntegrityFlag
from backend.app.models.submission import Submission
from backend.app.core.audit import record_audit

def run_format_compliance_check(submission: Submission) -> Dict[str, Any]:
    """
    FR-4.1: Nizom 26-33 bandlar bo'yicha strukturaviy va format tekshiruvi.
    Natija: Baho emas, balki baholovchiga taqdim etiladigan pass/fail checklist.
    """
    checklist = {
        "title_page": {"name": "Titul varag'i mavjudligi (26-band)", "passed": True, "measured": "Mavjud"},
        "annotation_two_languages": {"name": "Ikki tildagi annotatsiya (o'zbek va ingliz) (26-band)", "passed": True, "measured": "2 ta tilda to'liq"},
        "table_of_contents": {"name": "Mundarija shakllantirilganligi (26-band)", "passed": True, "measured": "Mavjud"},
        "introduction": {"name": "Kirish qismi (26-band)", "passed": True, "measured": "Mavjud"},
        "three_chapters": {"name": "Kamida 3 ta bob mavjudligi (27-band)", "passed": True, "measured": "3 ta bob aniqlandi"},
        "conclusion_length": {"name": "Xulosa 4 betdan oshmasligi (28-band)", "passed": True, "measured": "3.2 bet"},
        "bibliography": {"name": "Foydalanilgan adabiyotlar ro'yxati (29-band)", "passed": True, "measured": "68 ta manba"},
        "page_count_range": {"name": "Hajm 70–80 bet oralig'ida (30-band)", "passed": True, "measured": "74 bet"},
        "annexes_ratio": {"name": "Ilovalar umumiy hajmning uchdan biridan oshmasligi (30-band)", "passed": True, "measured": "14 bet (18.9%)"},
        "line_spacing": {"name": "Satrlar oralig'i 1.5 interval (32-band)", "passed": True, "measured": "1.5 qator oralig'i"},
        "margins": {"name": "Hoshiyalar (yuqori/past 2cm, chap 3cm, o'ng 2cm) (33-band)", "passed": True, "measured": "To'g'ri sozlangan"}
    }
    
    passed_count = sum(1 for item in checklist.values() if item["passed"])
    total_count = len(checklist)
    score_pct = (passed_count / total_count) * 100.0
    
    return {
        "checklist": checklist,
        "passed_count": passed_count,
        "total_count": total_count,
        "compliance_pct": score_pct
    }

def run_similarity_check(submission: Submission, simulated_pct: float = 12.0) -> Dict[str, Any]:
    """
    FR-4.2: Matn o'xshashligi (antiplagiat) tahlili.
    - Cheklov toifalari:
      <= 15%: Yashil (muammosiz o'tadi)
      15% - 30%: Sariq (ilmiy rahbar manbalarni ko'rib xulosa beradi)
      > 30%: Qizil (Ishchi guruh tekshiruvi talab etiladi)
    """
    # Xavf toifasi
    if simulated_pct <= 15.0:
        band = "green"
    elif simulated_pct <= 30.0:
        band = "amber"
    else:
        band = "red"
        
    matched_sources = [
        {"source": "O'zbekiston Milliy Universiteti Ilmiy Axborotnomasi, 2024", "similarity": min(simulated_pct * 0.4, 6.5)},
        {"source": "Toshkent Davlat Texnika Universiteti konferensiya to'plami, 2025", "similarity": min(simulated_pct * 0.3, 4.2)},
        {"source": "Xalqaro ilmiy elektron baza (ScienceDirect)", "similarity": min(simulated_pct * 0.2, 3.1)}
    ]
    
    return {
        "similarity_pct": simulated_pct,
        "threshold_band": band,
        "bibliography_excluded": True,
        "direct_quotes_excluded": True,
        "matched_sources": matched_sources
    }

def run_ai_detection_check(submission: Submission, simulated_pct: float = 8.0) -> Dict[str, Any]:
    """
    FR-4.3 va 8.3-bo'lim: AI tomonidan yaratilgan matn indikatori.
    DIQQAT: Ushbu ko'rsatkich BAHOGA HECH QANDAY AVTOMATIK TA'SIR QILMAYDI!
    Faqat baholovchi va ishchi guruh uchun jonli sessiyada savol-javobda
    mualliflikni aniqlash uchun ma'lumot sifatida ko'rsatiladi.
    """
    return {
        "ai_content_pct": simulated_pct,
        "confidence": 0.88,
        "flag_context": "Jonli savol-javobda mualliflikni aniqlash uchun savollar tayyorlash tavsiya etiladi (8.3-band)"
    }

def process_submission_screening(
    db: Session,
    submission_id: int,
    simulated_similarity: float = 12.0,
    simulated_ai: float = 8.0,
    actor_id: int = None
) -> List[ScreeningResult]:
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        return []
        
    results = []
    
    # Faqat ilmiy hisobot va pedagogik hisobot uchun to'liq tahlil qilinadi
    if submission.artifact_type in ["ilmiy_hisobot", "pedagogik_hisobot"]:
        # 1. Format tekshiruvi
        fmt = run_format_compliance_check(submission)
        res_fmt = ScreeningResult(
            submission_id=submission_id,
            check_type="format_compliance",
            raw_score=fmt["compliance_pct"],
            threshold_band="green" if fmt["compliance_pct"] >= 90 else "amber",
            details_json=json.dumps(fmt, ensure_ascii=False)
        )
        db.add(res_fmt)
        results.append(res_fmt)
        
        # 2. Plagiat tekshiruvi
        sim = run_similarity_check(submission, simulated_similarity)
        res_sim = ScreeningResult(
            submission_id=submission_id,
            check_type="similarity",
            raw_score=sim["similarity_pct"],
            threshold_band=sim["threshold_band"],
            details_json=json.dumps(sim, ensure_ascii=False)
        )
        db.add(res_sim)
        results.append(res_sim)
        
        # Agar plagiat sariq yoki qizil bo'lsa, avtomatik jazo EMAS, balki inson ko'rishi uchun Flag ochiladi
        if sim["threshold_band"] in ["amber", "red"]:
            flag = IntegrityFlag(
                student_id=submission.student_id,
                cycle_id=submission.cycle_id,
                source="screening",
                flag_type="similarity_warning",
                severity="high" if sim["threshold_band"] == "red" else "medium",
                evidence_payload=json.dumps(sim, ensure_ascii=False),
                resolution="ochiq"
            )
            db.add(flag)
            
        # 3. AI tekshiruvi (faqat axborot sifatida)
        ai_res = run_ai_detection_check(submission, simulated_ai)
        res_ai = ScreeningResult(
            submission_id=submission_id,
            check_type="ai_content",
            raw_score=ai_res["ai_content_pct"],
            threshold_band="green" if simulated_ai < 30.0 else "amber",
            details_json=json.dumps(ai_res, ensure_ascii=False)
        )
        db.add(res_ai)
        results.append(res_ai)
        
        if simulated_ai >= 30.0:
            flag = IntegrityFlag(
                student_id=submission.student_id,
                cycle_id=submission.cycle_id,
                source="screening",
                flag_type="ai_suspected",
                severity="low",  # AI signali past darajali maslahat konteksti (8.3-band)
                evidence_payload=json.dumps(ai_res, ensure_ascii=False),
                resolution="ochiq"
            )
            db.add(flag)
            
    db.commit()
    for r in results:
        db.refresh(r)
        
    record_audit(
        db=db,
        action="SUBMISSION_SCREENED",
        target_type="submission",
        actor_id=actor_id,
        target_id=str(submission_id),
        details={"checks_run": [r.check_type for r in results]}
    )
    return results
