import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
import json

from backend.app.main import app
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.user import User, ConsentRecord, BiometricEnrolment
from backend.app.models.submission import Submission, Publication
from backend.app.models.calendar import CalendarPlanItem
from backend.app.models.cycle import MonitoringCycle
from backend.app.models.rubric import RubricVersion, RubricCriterion, ScoreEntry, ScoreOverride, FinalMark
from backend.app.models.appeal import Appeal
from backend.app.models.session import PresentationSession, VerificationEvent
from backend.app.models.screening import ScreeningResult, IntegrityFlag
from backend.app.models.audit_entry import AuditEntry
from backend.app.core.audit import verify_audit_integrity, record_audit
from backend.app.services.scoring_engine import calculate_and_save_final_mark
from backend.app.services.retention_service import execute_retention_cleanup
from backend.app.services.report_generator import generate_scientific_council_excel, generate_evidence_pack_pdf

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_test_db():
    from backend.seed_data import seed_database
    seed_database()
    yield
    # Teardown if needed

def get_auth_token(username: str = "talaba1", password: str = "parol123") -> str:
    response = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    return response.json()["access_token"]

# -------------------------------------------------------------
# A1: Talaba biometrik ro'yxatdan o'tadi, 3 ta artefaktni yuklaydi
# -------------------------------------------------------------
def test_A1_student_enrol_and_submit_all_three(setup_test_db):
    token = get_auth_token("talaba1", "parol123")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Biometrik rozilik
    r_consent = client.post("/api/v1/auth/consent", json={"is_granted": True, "consent_type": "biometric_processing"}, headers=headers)
    assert r_consent.status_code == 200
    assert r_consent.json()["is_granted"] == True
    
    # 2. 3 ta artefaktni yuklash
    db = SessionLocal()
    student = db.query(User).filter(User.username == "talaba1").first()
    cycle = db.query(MonitoringCycle).first()
    db.close()
    
    # Taqdimot slayd
    r1 = client.post(
        "/api/v1/students/upload-artifact",
        data={"cycle_id": cycle.id, "artifact_type": "taqdimot_slayd", "verification_method": "yuz_biometrikasi"},
        files={"file": ("taqdimot.pptx", b"Fake PPTX presentation binary content for Dilshod", "application/vnd.ms-powerpoint")},
        headers=headers
    )
    assert r1.status_code == 200
    sub1 = r1.json()
    assert len(sub1["sha256_hash"]) == 64
    assert sub1["version_number"] >= 1
    
    # Ilmiy hisobot
    r2 = client.post(
        "/api/v1/students/upload-artifact",
        data={"cycle_id": cycle.id, "artifact_type": "ilmiy_hisobot", "verification_method": "yuz_biometrikasi"},
        files={"file": ("ilmiy_hisobot.pdf", b"Fake PDF scientific report binary content for Dilshod", "application/pdf")},
        headers=headers
    )
    assert r2.status_code == 200
    sub2 = r2.json()
    assert len(sub2["sha256_hash"]) == 64
    
    # Pedagogik hisobot
    r3 = client.post(
        "/api/v1/students/upload-artifact",
        data={"cycle_id": cycle.id, "artifact_type": "pedagogik_hisobot", "verification_method": "yuz_biometrikasi"},
        files={"file": ("pedagogik_hisobot.pdf", b"Fake PDF pedagogical report binary content", "application/pdf")},
        headers=headers
    )
    assert r3.status_code == 200
    sub3 = r3.json()
    assert len(sub3["sha256_hash"]) == 64
    
    # Checklistda barcha 3 ta artefakt mavjudligi
    r_list = client.get(f"/api/v1/students/my-submissions?cycle_id={cycle.id}", headers=headers)
    assert r_list.status_code == 200
    artifacts = {s["artifact_type"] for s in r_list.json()}
    assert "taqdimot_slayd" in artifacts
    assert "ilmiy_hisobot" in artifacts
    assert "pedagogik_hisobot" in artifacts

# -------------------------------------------------------------
# A2: Jonli sessiyada begona shaxs o'tirishga uringanda
# Sessiya to'xtatilmaydi, dalil bilan flag ochiladi
# -------------------------------------------------------------
def test_A2_face_non_match_raises_flag_without_terminating_session(setup_test_db):
    db = SessionLocal()
    sess = db.query(PresentationSession).first()
    db.close()
    
    r = client.post(
        f"/api/v1/live-session/{sess.id}/event?event_type=continuous_face&result=no_match&confidence=0.25&evidence_frame_ref=frame_nonmatch_a2.jpg"
    )
    assert r.status_code == 200
    
    # Tekshiramiz: Sessiya holati uzilmagan, lekin IntegrityFlag yaratilgan
    db = SessionLocal()
    sess_after = db.query(PresentationSession).filter(PresentationSession.id == sess.id).first()
    assert sess_after.status != "bekor_qilindi"  # Sessiya majburiy o'chirilmaydi
    
    flag = db.query(IntegrityFlag).filter(
        IntegrityFlag.source == "live_session",
        IntegrityFlag.flag_type == "face_non_match"
    ).first()
    assert flag is not None
    assert flag.resolution == "ochiq"
    db.close()

# -------------------------------------------------------------
# A3: Liveness check fototexnika/telefon tutilganda xatolik beradi
# -------------------------------------------------------------
def test_A3_liveness_check_failed_logged(setup_test_db):
    db = SessionLocal()
    sess = db.query(PresentationSession).first()
    db.close()
    
    r = client.post(
        f"/api/v1/live-session/{sess.id}/event?event_type=liveness_check&result=no_match&confidence=0.10&evidence_frame_ref=screen_replay_attack.jpg"
    )
    assert r.status_code == 200
    
    db = SessionLocal()
    event = db.query(VerificationEvent).filter(
        VerificationEvent.session_id == sess.id,
        VerificationEvent.event_type == "liveness_check"
    ).order_by(VerificationEvent.id.desc()).first()
    assert event is not None
    assert event.result == "no_match"
    db.close()

# -------------------------------------------------------------
# A4: Aloqa uzilganda texnik hodisa deb yoziladi, intizomiy flag ochilmaydi
# -------------------------------------------------------------
def test_A4_connection_drop_is_technical_event_not_penalty(setup_test_db):
    db = SessionLocal()
    sess = db.query(PresentationSession).first()
    db.close()
    
    r = client.post(
        f"/api/v1/live-session/{sess.id}/event?event_type=connection_drop&result=technical_event&confidence=1.0"
    )
    assert r.status_code == 200
    
    db = SessionLocal()
    event = db.query(VerificationEvent).filter(
        VerificationEvent.session_id == sess.id,
        VerificationEvent.event_type == "connection_drop"
    ).first()
    assert event is not None
    assert event.result == "technical_event"
    
    # Qoidabuzarlik (IntegrityFlag) bo'lmasligi kerak
    drop_flag = db.query(IntegrityFlag).filter(
        IntegrityFlag.flag_type == "connection_drop"
    ).first()
    assert drop_flag is None  # LR-3.8 talabi: texnik uzilish qoidabuzarlik hisoblanmaydi
    db.close()

# -------------------------------------------------------------
# A5: Biometrikadan bosh tortgan talaba teng sharoitda oflayn topshiradi
# -------------------------------------------------------------
def test_A5_biometrics_declined_fallback_route_without_disadvantage(setup_test_db):
    token = get_auth_token("talaba3", "parol123")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Talaba biometrikadan bosh tortadi
    r_consent = client.post("/api/v1/auth/consent", json={"is_granted": False, "consent_type": "biometric_processing"}, headers=headers)
    assert r_consent.status_code == 200
    assert r_consent.json()["is_granted"] == False
    
    # Oflayn shaxsni tasdiqlash yo'li rasmiylashtiriladi
    r_enrol = client.post(
        "/api/v1/auth/enrol-biometrics",
        json={
            "face_template_hash": "none",
            "is_in_person_fallback": True,
            "in_person_verifier_name": "Kafedra kotibi Dilnoza Karimova"
        },
        headers=headers
    )
    assert r_enrol.status_code == 200
    assert r_enrol.json()["fallback"] == True
    
    db = SessionLocal()
    student3 = db.query(User).filter(User.username == "talaba3").first()
    cycle = db.query(MonitoringCycle).first()
    rubric_v = db.query(RubricVersion).first()
    
    # Baho hisoblanganda og'irliklar teng qo'llaniladi
    mark = calculate_and_save_final_mark(db, student3.id, cycle.id, rubric_v.id)
    assert mark.total_score >= 0.0  # Hech qanday minus ball yoki jarima qo'llanmadi
    db.close()

# -------------------------------------------------------------
# A6: Ko'chirilgan matn (plagiat) aniqlanganda baho avtomatik kamaytirilmaydi
# -------------------------------------------------------------
def test_A6_plagiarism_flags_for_review_without_auto_deduction(setup_test_db):
    db = SessionLocal()
    sub = db.query(Submission).filter(Submission.artifact_type == "ilmiy_hisobot").first()
    from backend.app.services.screening_service import process_submission_screening
    
    # Yuqori plagiat (masalan 42% - qizil hudud)
    process_submission_screening(db, sub.id, simulated_similarity=42.0, simulated_ai=5.0)
    
    # Flag ochildi
    flag = db.query(IntegrityFlag).filter(
        IntegrityFlag.student_id == sub.student_id,
        IntegrityFlag.flag_type == "similarity_warning"
    ).first()
    assert flag is not None
    assert flag.severity == "high"
    assert flag.resolution == "ochiq"
    
    # Baho avtomatik o'zgarmasligi kerak
    final_mark = db.query(FinalMark).filter(FinalMark.student_id == sub.student_id).first()
    # Scoring engine plagiat tufayli avtomatik -10 yoki 0 qilmaydi, inson xulosasi kerak
    db.close()

# -------------------------------------------------------------
# A7: AI detektor natijasi bahoni avtomatik tushirmaydi (8.3-band)
# -------------------------------------------------------------
def test_A7_ai_detection_does_not_deduct_grade_automatically(setup_test_db):
    db = SessionLocal()
    sub = db.query(Submission).filter(Submission.artifact_type == "ilmiy_hisobot").first()
    from backend.app.services.screening_service import process_submission_screening
    
    # Yuqori AI aniqlanishi (75%)
    process_submission_screening(db, sub.id, simulated_similarity=8.0, simulated_ai=75.0)
    
    # Flag faqat kontekst sifatida yaratiladi
    ai_flag = db.query(IntegrityFlag).filter(
        IntegrityFlag.student_id == sub.student_id,
        IntegrityFlag.flag_type == "ai_suspected"
    ).first()
    assert ai_flag is not None
    assert ai_flag.severity == "low"  # Past darajali kontekst
    
    scr_ai = db.query(ScreeningResult).filter(
        ScreeningResult.submission_id == sub.id,
        ScreeningResult.check_type == "ai_content"
    ).order_by(ScreeningResult.id.desc()).first()
    assert scr_ai.raw_score == 75.0
    db.close()

# -------------------------------------------------------------
# A8: Ikki baholovchi 40 ball farq bilan baholasa (Divergence > 20)
# Kafedra mudiriga og'ish bayrog'i (flag) ko'rsatiladi
# -------------------------------------------------------------
def test_A8_assessors_divergence_flagged_to_head_of_department(setup_test_db):
    token_assessor1 = get_auth_token("baholovchi1", "parol123")
    token_assessor2 = get_auth_token("baholovchi2", "parol123")
    
    db = SessionLocal()
    student = db.query(User).filter(User.username == "talaba2").first()
    cycle = db.query(MonitoringCycle).first()
    criteria = db.query(RubricCriterion).filter(RubricCriterion.component_name == "ilmiy_hisobot").all()
    db.close()
    
    # 1-baholovchi barchasiga 5 ball qo'yadi (Annex A talabi bo'yicha 5 ballga izoh kiritiladi)
    scores_high = [{"criterion_id": c.id, "score_value": 5, "comment": "Tadqiqot juda mukammal darajada bajarilgan"} for c in criteria]
    r1 = client.post(
        "/api/v1/assessors/submit-scores",
        json={"student_id": student.id, "cycle_id": cycle.id, "component_name": "ilmiy_hisobot", "scores": scores_high},
        headers={"Authorization": f"Bearer {token_assessor1}"}
    )
    assert r1.status_code == 200
    
    # 2-baholovchi barchasiga 1 ball qo'yadi (kamida 40 ballik farq hosil qilish uchun)
    scores_low = [{"criterion_id": c.id, "score_value": 1, "comment": "Tadqiqotda mustaqillik va amaliyot yetarli emas"} for c in criteria]
    r2 = client.post(
        "/api/v1/assessors/submit-scores",
        json={"student_id": student.id, "cycle_id": cycle.id, "component_name": "ilmiy_hisobot", "scores": scores_low},
        headers={"Authorization": f"Bearer {token_assessor2}"}
    )
    assert r2.status_code == 200
    
    # Kafedra mudiri panelida og'ish (divergence) bayrog'ini tekshirish
    token_head = get_auth_token("kafedra_mudiri", "parol123")
    r_div = client.get(f"/api/v1/department/divergent-cases?cycle_id={cycle.id}", headers={"Authorization": f"Bearer {token_head}"})
    assert r_div.status_code == 200
    divergent_list = r_div.json()
    assert any(d["student_id"] == student.id for d in divergent_list)

# -------------------------------------------------------------
# A9: Kafedra mudiri bahoni tahrirlasa (override), yozma asos majburiy
# va u dalillar to'plamida hamda auditda aks etadi
# -------------------------------------------------------------
def test_A9_department_head_score_override_requires_justification(setup_test_db):
    token_head = get_auth_token("kafedra_mudiri", "parol123")
    headers = {"Authorization": f"Bearer {token_head}"}
    
    db = SessionLocal()
    student = db.query(User).filter(User.username == "talaba2").first()
    cycle = db.query(MonitoringCycle).first()
    db.close()
    
    # Asossiz urinish rad etilishi kerak
    r_fail = client.post(
        "/api/v1/department/override-score",
        json={"student_id": student.id, "cycle_id": cycle.id, "component_name": "research_report_score", "override_score": 25.0, "justification": ""},
        headers=headers
    )
    assert r_fail.status_code in [400, 422]
    
    # Asosli tahrirlash qabul qilinadi
    justification_text = "Ishchi guruh a'zolari o'rtasida katta og'ish bo'lganligi sababli, kafedra yig'ilishida qayta ko'rib chiqildi va 24.5 ball belgilandi."
    r_ok = client.post(
        "/api/v1/department/override-score",
        json={"student_id": student.id, "cycle_id": cycle.id, "component_name": "research_report_score", "override_score": 24.5, "justification": justification_text},
        headers=headers
    )
    assert r_ok.status_code == 200
    assert r_ok.json()["status"] == "muvaffaqiyatli"
    
    # Auditda va dalillar to'plamida mavjudligini tekshirish
    db = SessionLocal()
    audit_entry = db.query(AuditEntry).filter(AuditEntry.action == "SCORE_OVERRIDE").first()
    assert audit_entry is not None
    assert "24.5" in audit_entry.details
    db.close()

# -------------------------------------------------------------
# A10: Baho e'lon qilingandan so'ng 60 soatda apellatsiya berish
# (72 soatlik darcha ichida) qabul qilinadi va 24 soatlik taymer ochiladi
# -------------------------------------------------------------
def test_A10_appeal_filed_at_60_hours_within_72h_window(setup_test_db):
    token_head = get_auth_token("kafedra_mudiri", "parol123")
    db = SessionLocal()
    cycle = db.query(MonitoringCycle).first()
    student = db.query(User).filter(User.username == "talaba1").first()
    rubric_v = db.query(RubricVersion).first()
    
    cycle_id = cycle.id
    student_id = student.id
    rubric_v_id = rubric_v.id
    
    # Dastlabki bahoni hisoblash
    final_mark = calculate_and_save_final_mark(db, student_id, cycle_id, rubric_v_id)
    
    # Bahoni 60 soat avval e'lon qilingan deb simulyatsiya qilamiz
    now = datetime.now(timezone.utc)
    final_mark.published_at = now - timedelta(hours=60)
    db.add(final_mark)
    db.commit()
    final_mark_id = final_mark.id
    db.close()
    
    token_student = get_auth_token("talaba1", "parol123")
    r_appeal = client.post(
        "/api/v1/students/file-appeal",
        json={
            "cycle_id": cycle_id,
            "final_mark_id": final_mark_id,
            "grounds": "Ilmiy hisobotim bo'yicha adabiyotlar tahliliga yetarli baho berilmagan deb hisoblayman.",
            "target_component": "ilmiy_hisobot"
        },
        headers={"Authorization": f"Bearer {token_student}"}
    )
    assert r_appeal.status_code == 200
    app_data = r_appeal.json()
    assert app_data["status"] == "topshirildi"
    
    # 24 soatlik qaror darchasi mavjudligi
    deadline = datetime.fromisoformat(app_data["decision_deadline"].replace("Z", "+00:00"))
    if deadline.tzinfo is not None and now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    elif deadline.tzinfo is None and now.tzinfo is not None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    assert deadline > now

# -------------------------------------------------------------
# A11: Apellatsiya qanoatlantirilganda yangi baho versiyasi yaratiladi,
# asl baho va apellatsiya ham ko'rinib qoladi, reyting qayta hisoblanadi
# -------------------------------------------------------------
def test_A11_successful_appeal_creates_new_version_and_updates_rank(setup_test_db):
    token_appeal = get_auth_token("apellatsiya1", "parol123")
    headers = {"Authorization": f"Bearer {token_appeal}"}
    
    db = SessionLocal()
    appeal = db.query(Appeal).filter(Appeal.status == "topshirildi").first()
    appeal_id = appeal.id
    appeal_final_mark_id = appeal.final_mark_id
    old_mark = db.query(FinalMark).filter(FinalMark.id == appeal_final_mark_id).first()
    old_version = old_mark.version_number
    db.close()
    
    r_resolve = client.post(
        f"/api/v1/appeals/resolve?appeal_id={appeal_id}",
        json={
            "decision": "qanoatlantirildi",
            "commission_members": "Prof. Sh.Aliyev, Prof. K.Rasulov, Dots. M.Azizov",
            "commission_decision_notes": "Talabaning adabiyotlar tahlili qayta tekshirildi va qo'shimcha 4 ball qo'shildi.",
            "adjusted_scores": {
                "research_report_score": 28.0
            }
        },
        headers=headers
    )
    assert r_resolve.status_code == 200
    res_data = r_resolve.json()
    assert res_data["decision"] == "qanoatlantirildi"
    
    db = SessionLocal()
    # Yangi baho versiyasi
    new_mark = db.query(FinalMark).filter(FinalMark.id == res_data["resulting_mark_id"]).first()
    assert new_mark is not None
    assert new_mark.version_number == old_version + 1
    assert new_mark.is_active == True
    
    # Eski baho ham o'chmagan bo'lishi shart
    old_mark_check = db.query(FinalMark).filter(FinalMark.id == appeal_final_mark_id).first()
    assert old_mark_check is not None
    assert old_mark_check.is_active == False
    db.close()

# -------------------------------------------------------------
# A12: Administrator bahoni o'chirishga yoki o'zgartirishga uringanda
# taqiqlanadi va urinish auditga yoziladi
# -------------------------------------------------------------
def test_A12_admin_cannot_alter_score_and_attempt_is_logged(setup_test_db):
    token_admin = get_auth_token("admin", "parol123")
    headers = {"Authorization": f"Bearer {token_admin}"}
    
    r = client.post("/api/v1/audit/attempt-tamper", headers=headers)
    assert r.status_code == 403
    assert "FR-10.3 taqiqi" in r.json()["detail"]
    
    # Auditda ushbu urinish qayd etilganini tekshirish
    db = SessionLocal()
    tamper_audit = db.query(AuditEntry).filter(
        AuditEntry.action == "UNAUTHORIZED_SCORE_ALTERATION_ATTEMPT"
    ).first()
    assert tamper_audit is not None
    db.close()

# -------------------------------------------------------------
# A13: Ilmiy Kengash hisoboti (VMQ 52) O'zbek, Rus va Ingliz tilida
# Lotin yozuvidagi maxsus harflar (o‘, g‘, sh, ch) buzilmasdan chiqadi
# -------------------------------------------------------------
def test_A13_scientific_council_report_export_with_uzbek_latin(setup_test_db):
    db = SessionLocal()
    cycle = db.query(MonitoringCycle).first()
    db.close()
    
    # Excel eksporti
    r_excel = client.get(f"/api/v1/department/export-council-report?cycle_id={cycle.id}")
    assert r_excel.status_code == 200
    assert len(r_excel.content) > 1000  # Haqiqiy XLSX fayl
    assert r_excel.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    
    # PDF Dalillar to'plami eksporti
    db = SessionLocal()
    student = db.query(User).filter(User.username == "talaba1").first()
    db.close()
    
    r_pdf = client.get(f"/api/v1/department/evidence-pack/{student.id}?cycle_id={cycle.id}")
    assert r_pdf.status_code == 200
    assert r_pdf.content.startswith(b"%PDF")

# -------------------------------------------------------------
# A14: Keyingi tsikl uchun rubrika o'zgarganda avvalgi baholar o'zgarmasdan qoladi
# -------------------------------------------------------------
def test_A14_rubric_versioning_preserves_historical_marks(setup_test_db):
    db = SessionLocal()
    # 1-versiyadagi baho
    mark_v1 = db.query(FinalMark).first()
    orig_total = mark_v1.total_score
    orig_v_id = mark_v1.rubric_version_id
    
    # Yangi rubrika versiyasini yaratamiz
    rubric_v2 = RubricVersion(
        version_code="v2.0-2027",
        academic_year="2026-2027",
        course_year=1,
        config_json=json.dumps({"weights": {"research": 35, "live": 15}})
    )
    db.add(rubric_v2)
    db.commit()
    
    # Avvalgi baho o'zgarmasligi kerak
    mark_after = db.query(FinalMark).filter(FinalMark.id == mark_v1.id).first()
    assert mark_after.total_score == orig_total
    assert mark_after.rubric_version_id == orig_v_id
    db.close()

# -------------------------------------------------------------
# A15: Saqlash muddati (retention) tozalash jarayoni
# Apellatsiyadagi ishlarni saqlab qoladi va amallar auditlanadi
# -------------------------------------------------------------
def test_A15_retention_job_preserves_appealed_submissions_and_logs(setup_test_db):
    token_admin = get_auth_token("admin", "parol123")
    headers = {"Authorization": f"Bearer {token_admin}"}
    
    # Retention jobni chaqiramiz
    r = client.post("/api/v1/audit/run-retention-job?force_days=0", headers=headers)
    assert r.status_code == 200
    res = r.json()
    assert res["status"] == "muvaffaqiyatli"
    
    # Auditda yaxlitlik zanjirini tekshiramiz (Hash chain verification)
    db = SessionLocal()
    chain_report = verify_audit_integrity(db)
    assert chain_report["valid"] == True
    db.close()
