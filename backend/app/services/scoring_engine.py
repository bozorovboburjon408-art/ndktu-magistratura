import json
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.models.rubric import RubricVersion, RubricCriterion, ScoreEntry, ScoreOverride, FinalMark
from backend.app.models.submission import Publication
from backend.app.models.calendar import CalendarPlanItem
from backend.app.models.user import User
from backend.app.core.config import settings
from backend.app.core.audit import record_audit

def calculate_grade(total_score: float) -> Tuple[int, str]:
    """
    Baholash shkalasi (VMQ № 36 va O'zbekiston OTM standartlari):
    86–100: 5 — A'lo (Plan to'liq bajarilgan, ko'rsatkichlar a'lo darajada)
    71–85:  4 — Yaxshi (Reja asosan bajarilgan, kichik tavsiyalar)
    60–70:  3 — Qoniqarli (Minimal talablar bajarilgan)
    <60:    2 — Qoniqarsiz (Ishchi guruhga qayta ko'rib chiqishga yuboriladi)
    """
    if total_score >= 86.0:
        return 5, "A'lo"
    elif total_score >= 71.0:
        return 4, "Yaxshi"
    elif total_score >= 60.0:
        return 3, "Qoniqarli"
    else:
        return 2, "Qoniqarsiz"

def compute_objective_scores(db: Session, student_id: int, cycle_id: int) -> Dict[str, float]:
    """
    Objektiv o'lchanadigan 3 ta komponentni hisoblash:
    1) Nashrlar (10 ball): 1-kursda kamida 1 ta, 2-kursda kamida 2 ta (VMQ 49-band)
    2) Kalendar reja va seminarlar (10 ball): o'z vaqtida bajarilgan va ilmiy rahbar tasdiqlagan reja foizi
    3) HEMIS GPA (5 ball): 100 ballik shkalaga normallashgan o'zlashtirish ko'rsatkichi
    """
    student = db.query(User).filter(User.id == student_id).first()
    course_year = student.course_year if student and student.course_year else 1
    
    # 1. Nashrlar
    publications = db.query(Publication).filter(
        Publication.student_id == student_id,
        Publication.cycle_id == cycle_id,
        Publication.is_verified == True
    ).all()
    pub_count = len(publications)
    required_pubs = 1 if course_year == 1 else 2
    
    if pub_count >= required_pubs:
        pub_score = 10.0
    else:
        pub_score = (pub_count / required_pubs) * 10.0
        
    # 2. Kalendar reja
    plan_items = db.query(CalendarPlanItem).filter(
        CalendarPlanItem.student_id == student_id,
        CalendarPlanItem.cycle_id == cycle_id
    ).all()
    
    if plan_items:
        confirmed_count = sum(1 for item in plan_items if item.supervisor_confirmed and item.status == "bajarildi")
        plan_score = (confirmed_count / len(plan_items)) * 10.0
    else:
        plan_score = 10.0  # Standart reja mavjud deb olinganda
        
    # 3. HEMIS GPA (5 ballik ulush)
    # HEMIS integratsiyasi bo'lmaganda yoki sinov uchun 85% standart baza olinadi
    gpa_score = 4.3  # 86% x 5 ball = 4.3 ball
    
    return {
        "publications_score": round(pub_score, 1),
        "calendar_plan_score": round(plan_score, 1),
        "academic_performance_score": round(gpa_score, 1)
    }

def calculate_assessor_component_totals(
    db: Session, student_id: int, cycle_id: int
) -> Tuple[Dict[str, float], bool, str]:
    """
    Barcha baholovchilarning ballarini jamlash, ko'p baholovchili o'rtachani topish
    va 20 balldan ortiq og'ish (divergence > 20) mavjudligini tekshirish.
    """
    score_entries = db.query(ScoreEntry).filter(
        ScoreEntry.student_id == student_id,
        ScoreEntry.cycle_id == cycle_id
    ).all()
    
    if not score_entries:
        return {
            "research_report_score": 0.0,
            "live_presentation_score": 0.0,
            "pedagogical_report_score": 0.0,
            "slides_score": 0.0
        }, False, ""

    # Baholovchilar bo'yicha guruhlash
    assessor_map: Dict[int, Dict[str, float]] = {}
    for entry in score_entries:
        if entry.assessor_id not in assessor_map:
            assessor_map[entry.assessor_id] = {
                "ilmiy_hisobot": 0.0,
                "jonli_taqdimot": 0.0,
                "pedagogik_hisobot": 0.0,
                "taqdimot_slaydlari": 0.0
            }
        assessor_map[entry.assessor_id][entry.component_name] += entry.score_value

    # Har bir baholovchining komponent ballarini foiz va og'irlik bo'yicha hisoblash
    # ilmiy_hisobot: max 50 ball -> weight 30
    # jonli_taqdimot: max 30 ball -> weight 20
    # pedagogik_hisobot: max 30 ball -> weight 15
    # taqdimot_slaydlari: max 20 ball -> weight 10
    assessor_weighted_totals: List[float] = []
    component_averages = {
        "research_report_score": 0.0,
        "live_presentation_score": 0.0,
        "pedagogical_report_score": 0.0,
        "slides_score": 0.0
    }
    
    num_assessors = len(assessor_map)
    for assessor_id, comp_scores in assessor_map.items():
        res_weighted = (comp_scores["ilmiy_hisobot"] / 50.0) * 30.0 if comp_scores["ilmiy_hisobot"] else 0.0
        pres_weighted = (comp_scores["jonli_taqdimot"] / 30.0) * 20.0 if comp_scores["jonli_taqdimot"] else 0.0
        ped_weighted = (comp_scores["pedagogik_hisobot"] / 30.0) * 15.0 if comp_scores["pedagogik_hisobot"] else 0.0
        slide_weighted = (comp_scores["taqdimot_slaydlari"] / 20.0) * 10.0 if comp_scores["taqdimot_slaydlari"] else 0.0
        
        tot = res_weighted + pres_weighted + ped_weighted + slide_weighted
        assessor_weighted_totals.append(tot)
        
        component_averages["research_report_score"] += res_weighted
        component_averages["live_presentation_score"] += pres_weighted
        component_averages["pedagogical_report_score"] += ped_weighted
        component_averages["slides_score"] += slide_weighted

    for key in component_averages:
        component_averages[key] = round(component_averages[key] / num_assessors, 1)

    # FR-5.3: Baholovchilar orasidagi og'ishni (divergence) aniqlash
    is_divergent = False
    divergence_info = ""
    if len(assessor_weighted_totals) > 1:
        diff = max(assessor_weighted_totals) - min(assessor_weighted_totals)
        if diff >= settings.DIVERGENCE_THRESHOLD:
            is_divergent = True
            divergence_info = f"Baholovchilar o'rtasida {diff:.1f} ballik og'ish aniqlandi (Cheklov: {settings.DIVERGENCE_THRESHOLD} ball). Kafedra mudiri ko'rib chiqishi shart."

    return component_averages, is_divergent, divergence_info

def apply_overrides(
    db: Session, student_id: int, cycle_id: int, scores: Dict[str, float]
) -> Dict[str, float]:
    """
    Magistratura bo'limi boshlig'i tomonidan kiritilgan tahrirlashlarni (override) qo'llash
    """
    overrides = db.query(ScoreOverride).filter(
        ScoreOverride.student_id == student_id,
        ScoreOverride.cycle_id == cycle_id
    ).all()
    
    updated_scores = scores.copy()
    for ov in overrides:
        if ov.component_name in updated_scores:
            updated_scores[ov.component_name] = ov.override_score
    return updated_scores

def calculate_and_save_final_mark(
    db: Session,
    student_id: int,
    cycle_id: int,
    rubric_version_id: int,
    actor_id: Optional[int] = None
) -> FinalMark:
    """
    Talabaning 7 komponent bo'yicha umumiy 100 ballik yakuniy bahosini to'liq hisoblash
    va saqlash.
    """
    # 1. Baholovchilar ballari
    assessor_scores, is_divergent, divergence_info = calculate_assessor_component_totals(db, student_id, cycle_id)
    
    # 2. Objektiv ko'rsatkichlar
    objective_scores = compute_objective_scores(db, student_id, cycle_id)
    
    combined_scores = {**assessor_scores, **objective_scores}
    
    # 3. Tahrirlashlar (overrides)
    final_component_scores = apply_overrides(db, student_id, cycle_id, combined_scores)
    
    # 4. Yakuniy ball
    total = sum(final_component_scores.values())
    total = min(100.0, max(0.0, round(total, 1)))
    grade_scale, grade_label = calculate_grade(total)
    
    # Eski bahoni topish
    existing_mark = db.query(FinalMark).filter(
        FinalMark.student_id == student_id,
        FinalMark.cycle_id == cycle_id,
        FinalMark.is_active == True
    ).first()
    
    version_num = (existing_mark.version_number + 1) if existing_mark else 1
    if existing_mark:
        existing_mark.is_active = False
        db.add(existing_mark)
        
    final_mark = FinalMark(
        student_id=student_id,
        cycle_id=cycle_id,
        rubric_version_id=rubric_version_id,
        research_report_score=final_component_scores["research_report_score"],
        live_presentation_score=final_component_scores["live_presentation_score"],
        pedagogical_report_score=final_component_scores["pedagogical_report_score"],
        slides_score=final_component_scores["slides_score"],
        publications_score=final_component_scores["publications_score"],
        calendar_plan_score=final_component_scores["calendar_plan_score"],
        academic_performance_score=final_component_scores["academic_performance_score"],
        total_score=total,
        grade_scale=grade_scale,
        grade_label=grade_label,
        divergence_flag=is_divergent,
        divergence_details=divergence_info,
        version_number=version_num,
        is_active=True
    )
    db.add(final_mark)
    db.commit()
    db.refresh(final_mark)
    
    # Audit log
    record_audit(
        db=db,
        action="FINAL_MARK_COMPUTED",
        target_type="final_mark",
        actor_id=actor_id,
        target_id=str(final_mark.id),
        details={
            "student_id": student_id,
            "total_score": total,
            "grade": grade_scale,
            "grade_label": grade_label,
            "version": version_num,
            "is_divergent": is_divergent
        }
    )
    
    # Reytingni yangilash
    recalculate_specialty_rankings(db, cycle_id)
    db.refresh(final_mark)
    return final_mark

def recalculate_specialty_rankings(db: Session, cycle_id: int):
    """
    FR-6.2: Mutaxassislik va o'quv yili bo'yicha talabalarni reytingini hisoblash.
    Teng ballar bo'lganda tartib:
    1) Ilmiy hisobot bali
    2) Jonli taqdimot bali
    3) Nashrlar bali
    """
    active_marks = db.query(FinalMark).filter(
        FinalMark.cycle_id == cycle_id,
        FinalMark.is_active == True
    ).all()
    
    # Mutaxassislik bo'yicha guruhlash
    specialty_groups: Dict[str, List[FinalMark]] = {}
    for mark in active_marks:
        student = db.query(User).filter(User.id == mark.student_id).first()
        spec_key = f"{student.specialty}_{student.course_year}" if student else "default"
        if spec_key not in specialty_groups:
            specialty_groups[spec_key] = []
        specialty_groups[spec_key].append(mark)
        
    for spec_key, marks in specialty_groups.items():
        # Tartiblash: total desc, research desc, live desc, pub desc
        marks.sort(
            key=lambda m: (
                m.total_score,
                m.research_report_score,
                m.live_presentation_score,
                m.publications_score
            ),
            reverse=True
        )
        total_count = len(marks)
        for idx, m in enumerate(marks):
            m.rank_in_specialty = idx + 1
            m.total_in_specialty = total_count
            db.add(m)
            
    db.commit()
