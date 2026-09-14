import os
import json
import hashlib
from datetime import datetime, timedelta, timezone
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.core.security import get_password_hash
from backend.app.core.audit import record_audit
from backend.app.models.user import User, BiometricEnrolment, ConsentRecord
from backend.app.models.cycle import MonitoringCycle
from backend.app.models.calendar import CalendarPlanItem
from backend.app.models.submission import Submission, Publication
from backend.app.models.screening import ScreeningResult, IntegrityFlag
from backend.app.models.session import PresentationSession, VerificationEvent
from backend.app.models.rubric import RubricVersion, RubricCriterion, ScoreEntry, FinalMark
from backend.app.models.appeal import Appeal

def seed_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    print("Baza jadvallari yangilandi. Namuna ma'lumotlar yuklanmoqda...")
    
    hashed_pwd = get_password_hash("parol123")
    
    # 1. Foydalanuvchilar (Rollari bilan)
    supervisor = User(
        username="rahbar1",
        hashed_password=hashed_pwd,
        full_name="Dotsent, t.f.n. A. Qodirov",
        email="a.qodirov@edu.uz",
        role="ilmiy_rahbar"
    )
    db.add(supervisor)
    db.commit()
    db.refresh(supervisor)
    
    student1 = User(
        username="talaba1",
        hashed_password=hashed_pwd,
        full_name="Bozorov Bobur Qudrat o‘g‘li",
        email="b.bozorov@edu.uz",
        role="talaba",
        specialty="70610101 – Kompyuter tizimlari va dasturiy injiniring",
        course_year=2,
        hemis_id="3842100451",
        supervisor_id=supervisor.id
    )
    student2 = User(
        username="talaba2",
        hashed_password=hashed_pwd,
        full_name="Madina Rahimova",
        email="m.rahimova@edu.uz",
        role="talaba",
        specialty="70610101 - Kompyuter tizimlari va tarmoqlari",
        course_year=2,
        hemis_id="3842100452",
        supervisor_id=supervisor.id
    )
    student3 = User(
        username="talaba3",
        hashed_password=hashed_pwd,
        full_name="Azizbek Yusupov",
        email="a.yusupov@edu.uz",
        role="talaba",
        specialty="70610101 - Kompyuter tizimlari va tarmoqlari",
        course_year=1,
        hemis_id="3842100453",
        supervisor_id=supervisor.id
    )
    
    assessor1 = User(
        username="baholovchi1",
        hashed_password=hashed_pwd,
        full_name="Dots. Jamshid Nurmatov",
        email="j.nurmatov@edu.uz",
        role="baholovchi"
    )
    assessor2 = User(
        username="baholovchi2",
        hashed_password=hashed_pwd,
        full_name="Dots. Nilufar Qosimova",
        email="n.qosimova@edu.uz",
        role="baholovchi"
    )
    head_dept = User(
        username="kafedra_mudiri",
        hashed_password=hashed_pwd,
        full_name="Prof. Otabek Rustamov",
        email="o.rustamov@edu.uz",
        role="kafedra_mudiri"
    )
    appeal_member = User(
        username="apellatsiya1",
        hashed_password=hashed_pwd,
        full_name="Prof. Sherzod Aliyev",
        email="sh.aliyev@edu.uz",
        role="apellatsiya"
    )
    admin = User(
        username="admin",
        hashed_password=hashed_pwd,
        full_name="Tizim Administratori",
        email="admin@edu.uz",
        role="administrator"
    )
    
    db.add_all([student1, student2, student3, assessor1, assessor2, head_dept, appeal_member, admin])
    db.commit()
    
    # 2. Monitoring Tsikli
    now = datetime.now(timezone.utc)
    cycle = MonitoringCycle(
        title="2025-2026 o'quv yili, 2-semestr monitoringi",
        academic_year="2025-2026",
        semester=2,
        state="SUBMISSION_OPEN",
        submission_deadline=now + timedelta(days=14),
        appeal_deadline=now + timedelta(days=20)
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    
    # 3. Rubrika mezonlari (VMQ 44, 26-33, 7.3 - 7.6)
    rubric_v = RubricVersion(
        version_code="v1.0-2026-sem2",
        academic_year="2025-2026",
        course_year=1,
        config_json=json.dumps({"weights": {"research": 30, "live": 20, "pedagogical": 15, "slides": 10, "pubs": 10, "plan": 10, "gpa": 5}})
    )
    db.add(rubric_v)
    db.commit()
    db.refresh(rubric_v)
    
    # Ilmiy hisobot mezonlari (10 ta mezon, max 50 ball)
    res_criteria = [
        ("Tadqiqot mavzusining dolzarbligi va amaliyot bilan bog'liqligi", "VMQ 44-band"),
        ("Tadqiqot vazifalarini yechishda talabaning mustaqilligi", "VMQ 44-band"),
        ("Adabiyotlar, xorijiy manbalar va statistikani tanqidiy tahlil qilish chuqurligi", "VMQ 44-band"),
        ("Qo'llanilgan tadqiqot usullari va metodologiyaning asoslanganligi", "VMQ 44-band"),
        ("Olingan natijalar asosida berilgan amaliy tavsiyalarning ahamiyati", "VMQ 44-band"),
        ("Tadqiqot natijalarining kelgusidagi rivojlanish istiqbollarini ko'ra bilish", "VMQ 44-band"),
        ("Nazariy va amaliy qismlarning mantiqiy izchilligi", "VMQ 44-band"),
        ("Tuzilmaviy to'liqlik (titul, annotatsiya, mundarija, kirish, 3 bob, xulosa)", "VMQ 26-29 bandlar"),
        ("Format talablariga moslik (hajm 70-80 bet, 1.5 interval, hoshiyalar)", "VMQ 30, 32-33 bandlar"),
        ("Iqtiboslar to'g'riligi va adabiyotlar ro'yxatining haqqoniyligi", "VMQ 31-band")
    ]
    for idx, (c_name, clause) in enumerate(res_criteria, 1):
        db.add(RubricCriterion(
            rubric_version_id=rubric_v.id,
            component_name="ilmiy_hisobot",
            criterion_number=idx,
            criterion_name=c_name,
            source_clause=clause,
            description_5="A'lo darajada to'liq asoslangan",
            description_3="Qoniqarli, ayrim kamchiliklar mavjud",
            description_1="Minimal darajada yoki yuzaki"
        ))
        
    # Jonli taqdimot mezonlari (6 ta mezon, max 30 ball)
    live_criteria = [
        ("5 daqiqa ichida maqsad, metod, natija va ilmiy yangilikni yoritish", "VMQ 51-band"),
        ("Nutqning ravonligi va akademik terminologiyani to'g'ri qo'llash", "Standart"),
        ("Vaqt intizomiga rioya qilish (5 daqiqa ± 30 soniya)", "FR-3.3"),
        ("Jonli nutq bilan taqdimot slaydlari va hisobotning mosligi", "Standart"),
        ("Ishchi guruh savollariga mustaqil javob berish sifati", "VMQ 51-band"),
        ("Matnda keltirilmagan metodologik tanlovlarni tushuntira olish (Mualliflik isboti)", "FR-3.6, A2")
    ]
    for idx, (c_name, clause) in enumerate(live_criteria, 1):
        db.add(RubricCriterion(
            rubric_version_id=rubric_v.id,
            component_name="jonli_taqdimot",
            criterion_number=idx,
            criterion_name=c_name,
            source_clause=clause
        ))
        
    # Pedagogik hisobot mezonlari (6 ta mezon, max 30 ball)
    ped_criteria = [
        ("Kalendar reja bo'yicha o'tilgan pedagogik darslar hajmi va turi", "VMQ 14-band"),
        ("Tayyorlangan o'quv-uslubiy materiallar (dars ishlanmasi, keyslar) sifati", "Standart"),
        ("Innovatsion va interaktiv ta'lim texnologiyalarini qo'llaganlik", "Standart"),
        ("Pedagogik amaliyot o'tagan kafedraning yozma bahosi va taqrizi", "Standart"),
        ("O'z-o'zini tahlil qilish (refleksiya) va kasbiy rivojlanish ehtiyojlari", "Standart"),
        ("Tasdiqlovchi dalillar (dars jadvali, talabalar baholari) to'liqligi", "Standart")
    ]
    for idx, (c_name, clause) in enumerate(ped_criteria, 1):
        db.add(RubricCriterion(
            rubric_version_id=rubric_v.id,
            component_name="pedagogik_hisobot",
            criterion_number=idx,
            criterion_name=c_name,
            source_clause=clause
        ))
        
    # Taqdimot slaydlari mezonlari (4 ta mezon, max 20 ball)
    slide_criteria = [
        ("Mantiqiy tuzilma: muammo, maqsad, usullar, natijalar, xulosalar", "Standart"),
        ("Vizual ma'lumotlar sifati — jadvallar, grafiklar va sxemalar aniqligi", "Standart"),
        ("Haqqoniylik — slayddagi har bir ma'lumot hisobot bilan tasdiqlanganligi", "Standart"),
        ("Slaydlar zichligi — 5 daqiqada namoyish etishga mos hajmda ekanligi", "FR-3.2")
    ]
    for idx, (c_name, clause) in enumerate(slide_criteria, 1):
        db.add(RubricCriterion(
            rubric_version_id=rubric_v.id,
            component_name="taqdimot_slaydlari",
            criterion_number=idx,
            criterion_name=c_name,
            source_clause=clause
        ))
        
    db.commit()

    # 4. Talaba 1 uchun namunaviy ma'lumotlar
    # Rozilik
    consent = ConsentRecord(
        student_id=student1.id,
        consent_type="biometric_processing",
        consent_text_version="v1.0-2026",
        is_granted=True,
        consented_at=now
    )
    db.add(consent)
    
    # Biometrik shablon
    db.add(BiometricEnrolment(
        student_id=student1.id,
        template_encrypted=hashlib.sha256(b"bozorov_bobur_face_vector_sample").hexdigest(),
        status="active"
    ))
    
    # Kalendar reja bandlari (3 ta rasmiy band)
    cal1 = CalendarPlanItem(
        student_id=student1.id,
        cycle_id=cycle.id,
        category="ilmiy-tadqiqot",
        description="Magistrlik dissertatsiyasining 1-bob adabiyotlar tahlilini tayyorlash",
        planned_deadline=now - timedelta(days=25),
        completed_date=now - timedelta(days=27),
        status="bajarildi",
        supervisor_confirmed=True,
        supervisor_comment="1-bob tahliliy qismi to‘liq va chuqur ilmiy asoslangan"
    )
    cal2 = CalendarPlanItem(
        student_id=student1.id,
        cycle_id=cycle.id,
        category="pedagogik_amaliyot",
        description="Bakalavriat talabalariga 10 soat laboratoriya mashg'ulotlarini o'tkazish",
        planned_deadline=now - timedelta(days=15),
        completed_date=now - timedelta(days=17),
        status="bajarildi",
        supervisor_confirmed=True,
        supervisor_comment="10 soatlik laboratoriya mashg‘ulotlari metodik talablarga mos o‘tildi"
    )
    cal3 = CalendarPlanItem(
        student_id=student1.id,
        cycle_id=cycle.id,
        category="ilmiy_maqola",
        description="2 ta ilmiy maqolani nufuzli tahririyatlarga nashrga topshirish",
        planned_deadline=now - timedelta(days=10),
        completed_date=now - timedelta(days=12),
        status="bajarildi",
        supervisor_confirmed=True,
        supervisor_comment="OAK jurnali va xalqaro konferensiyaga maqolalar topshirildi"
    )
    db.add_all([cal1, cal2, cal3])
    
    # Nashrlar (2 ta rasmiy nashr: OAK jurnali va Xalqaro anjuman)
    pub1 = Publication(
        student_id=student1.id,
        cycle_id=cycle.id,
        title="Oliy ta'limda talabalar bilimini baholash jarayonlarining ko'p parametrli intellektual monitoring modeli",
        co_authors="Bozorov B., Qodirov A.",
        venue="Muhammed al-Xorazmiy avlodlari, 2026, № 1(27), 84-91-betlar",
        doi_or_issn="https://doi.org/10.37722/jhet.2026.01.014 | ISSN: 2181-0613",
        publication_type="oak_jurnal",
        is_verified=True,
        verifier_id=head_dept.id,
        verified_at=now
    )
    pub2 = Publication(
        student_id=student1.id,
        cycle_id=cycle.id,
        title="Magistrlik monitoringida akademik halollikni ta'minlash: AI indikatorlari va biometrik tekshiruv usullari tahlili",
        co_authors="Bozorov B.Q., Qodirov A.",
        venue="\"Zamonaviy AKT va raqamli iqtisodiyot\" xalqaro anjumani, Navoiy, 2026, 112-115-b.",
        doi_or_issn="ISBN 978-9943-5689-4-1",
        publication_type="xalqaro_anjuman",
        is_verified=True,
        verifier_id=head_dept.id,
        verified_at=now
    )
    db.add_all([pub1, pub2])

    # Artefaktlar (3 ta rasmiy hujjat, haqiqiy xesh va hajm bilan)
    sub1 = Submission(
        student_id=student1.id,
        cycle_id=cycle.id,
        artifact_type="ilmiy_hisobot",
        file_name="Bozorov_Bobur_Ilmiy_Natijalar_Hisoboti_2026.pdf",
        file_path="d:/Magistratura/storage/uploads/Bozorov_Bobur_Ilmiy_Natijalar_Hisoboti_2026.pdf",
        sha256_hash="7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        file_size_bytes=3421500,
        version_number=1,
        verification_method="yuz_biometrikasi"
    )
    sub2 = Submission(
        student_id=student1.id,
        cycle_id=cycle.id,
        artifact_type="taqdimot_slayd",
        file_name="Bozorov_Bobur_5_Daqiqalik_Taqdimot.pptx",
        file_path="d:/Magistratura/storage/uploads/Bozorov_Bobur_5_Daqiqalik_Taqdimot.pptx",
        sha256_hash="a94f58c732386bbd7a42ec3a1d95392cf99a80b06a524e4d7e8b625cf04b7713",
        file_size_bytes=8740200,
        version_number=1,
        verification_method="yuz_biometrikasi"
    )
    sub3 = Submission(
        student_id=student1.id,
        cycle_id=cycle.id,
        artifact_type="pedagogik_hisobot",
        file_name="Bozorov_Bobur_Pedagogik_Amaliyot_Hisoboti.pdf",
        file_path="d:/Magistratura/storage/uploads/Bozorov_Bobur_Pedagogik_Amaliyot_Hisoboti.pdf",
        sha256_hash="bc51d8b2e3e1451fbc10688a2c14de552f462a632fa5a7702f5a6b0c27941322",
        file_size_bytes=1950000,
        version_number=1,
        verification_method="yuz_biometrikasi"
    )
    db.add_all([sub1, sub2, sub3])
    db.commit()

    # Screening natijalari (Haqiqiy o'lchovlar: Plagiat 8.4%, AI 11.2%, Format 98.0%)
    scr1 = ScreeningResult(
        submission_id=sub1.id,
        check_type="format_compliance",
        raw_score=98.0,
        threshold_band="green",
        details_json=json.dumps({"passed_count": 11, "total_count": 11, "measured": "76 bet, 1.5 interval, barcha rasmiy standartlarga mos"}, ensure_ascii=False)
    )
    scr2 = ScreeningResult(
        submission_id=sub1.id,
        check_type="similarity",
        raw_score=8.4,
        threshold_band="green",
        details_json=json.dumps({"similarity_pct": 8.4, "band": "green", "matched": [{"source": "Muhammed al-Xorazmiy avlodlari, 2026, № 1(27)", "similarity_pct": 3.8}]}, ensure_ascii=False)
    )
    scr3 = ScreeningResult(
        submission_id=sub1.id,
        check_type="ai_content",
        raw_score=11.2,
        threshold_band="green",
        details_json=json.dumps({"ai_content_pct": 11.2, "note": "Tahririy yordamchi darajasida, me'yordan oshmagan"}, ensure_ascii=False)
    )
    db.add_all([scr1, scr2, scr3])

    # Jonli taqdimot sessiyasi (#SESS-2026-01)
    sess = PresentationSession(
        student_id=student1.id,
        cycle_id=cycle.id,
        scheduled_time=now - timedelta(hours=5),
        actual_start_time=now - timedelta(hours=5),
        actual_end_time=now - timedelta(hours=4, minutes=55),
        duration_seconds=300,
        status="yakunlandi",
        slide_submission_id=sub2.id,
        recording_file="session_recording_bozorov.mp4",
        panel_qa_notes="Talaba dissertatsiya mavzusi, taklif etilgan ko'p parametrli intellektual model va proktoring tizimi bo'yicha berilgan savollarga to'liq, chuqur va mustaqil javob berdi.",
        panel_recommendations="VMQ 51-band talablariga to'liq mos keladi. Natijalar OTM o'quv jarayonlariga tavsiya etilsin."
    )
    db.add(sess)

    # Yakuniy baho (97.66 ball, A'lo)
    fm = FinalMark(
        student_id=student1.id,
        cycle_id=cycle.id,
        rubric_version_id=rubric_v.id,
        research_report_score=29.0,
        live_presentation_score=19.5,
        pedagogical_report_score=14.5,
        slides_score=9.8,
        publications_score=10.0,
        calendar_plan_score=10.0,
        academic_performance_score=4.86,
        total_score=97.66,
        grade_scale=5,
        grade_label="A'lo",
        divergence_flag=False,
        version_number=1,
        is_active=True,
        rank_in_specialty=1,
        total_in_specialty=24
    )
    db.add(fm)
    db.commit()

    # Dastlabki audit yozuvi
    record_audit(
        db=db,
        action="SYSTEM_INITIALIZED",
        target_type="system",
        actor_id=admin.id,
        target_id="init_01",
        details={"environment": "production-ready", "regulation": "VMQ-36", "date": now.isoformat()}
    )
    
    db.close()
    print("Namuna ma'lumotlar muvaffaqiyatli saqlandi!")

if __name__ == "__main__":
    seed_database()
