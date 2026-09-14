import os
import json
from io import BytesIO
from typing import Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from backend.app.models.user import User
from backend.app.models.submission import Submission, Publication
from backend.app.models.screening import ScreeningResult, IntegrityFlag
from backend.app.models.session import PresentationSession, VerificationEvent
from backend.app.models.rubric import FinalMark, ScoreEntry, ScoreOverride, RubricCriterion
from backend.app.models.appeal import Appeal
from backend.app.models.cycle import MonitoringCycle

def build_student_evidence_pack_data(db: Session, student_id: int, cycle_id: int) -> Dict[str, Any]:
    student = db.query(User).filter(User.id == student_id).first()
    cycle = db.query(MonitoringCycle).filter(MonitoringCycle.id == cycle_id).first()
    supervisor = db.query(User).filter(User.id == student.supervisor_id).first() if student and student.supervisor_id else None
    
    submissions = db.query(Submission).filter(
        Submission.student_id == student_id,
        Submission.cycle_id == cycle_id
    ).all()
    
    session = db.query(PresentationSession).filter(
        PresentationSession.student_id == student_id,
        PresentationSession.cycle_id == cycle_id
    ).first()
    
    flags = db.query(IntegrityFlag).filter(
        IntegrityFlag.student_id == student_id,
        IntegrityFlag.cycle_id == cycle_id
    ).all()
    
    final_mark = db.query(FinalMark).filter(
        FinalMark.student_id == student_id,
        FinalMark.cycle_id == cycle_id,
        FinalMark.is_active == True
    ).first()
    
    overrides = db.query(ScoreOverride).filter(
        ScoreOverride.student_id == student_id,
        ScoreOverride.cycle_id == cycle_id
    ).all()
    
    appeals = db.query(Appeal).filter(
        Appeal.student_id == student_id,
        Appeal.cycle_id == cycle_id
    ).all()
    
    return {
        "talaba_fio": student.full_name if student else "Noma'lum",
        "hemis_id": student.hemis_id if student else "-",
        "mutaxassislik": student.specialty if student else "-",
        "bosqich": f"{student.course_year}-kurs" if student else "-",
        "ilmiy_rahbar": supervisor.full_name if supervisor else "Biriktirilmagan",
        "tsikl_nomi": cycle.title if cycle else "-",
        "artefaktlar": [
            {
                "turi": s.artifact_type,
                "fayl_nomi": s.file_name,
                "sha256": s.sha256_hash,
                "hajmi_kb": round(s.file_size_bytes / 1024, 1),
                "versiya": s.version_number,
                "yuklangan_vaqt": s.uploaded_at.isoformat() if s.uploaded_at else "-"
            }
            for s in submissions
        ],
        "sessiya": {
            "holati": session.status if session else "O'tkazilmagan",
            "davomiyligi_soniya": session.duration_seconds if session else 0,
            "savol_javob_qaydlari": session.panel_qa_notes if session else "Mavjud emas",
            "tavsiyalar": session.panel_recommendations if session else "Mavjud emas"
        } if session else None,
        "signallar_flags": [
            {
                "manba": f.source,
                "turi": f.flag_type,
                "darajasi": f.severity,
                "holati": f.resolution,
                "xulosa_izohi": f.resolution_notes or "Kutilmoqda"
            }
            for f in flags
        ],
        "yakuniy_baho": {
            "umumiy_ball": final_mark.total_score if final_mark else 0.0,
            "baho_shkalasi": final_mark.grade_scale if final_mark else 0,
            "baho_sozda": final_mark.grade_label if final_mark else "Baholanmagan",
            "versiya": final_mark.version_number if final_mark else 1,
            "reyting_orni": f"{final_mark.rank_in_specialty}/{final_mark.total_in_specialty}" if final_mark and final_mark.rank_in_specialty else "-",
            "komponentlar": {
                "ilmiy_hisobot": final_mark.research_report_score if final_mark else 0,
                "jonli_taqdimot": final_mark.live_presentation_score if final_mark else 0,
                "pedagogik_hisobot": final_mark.pedagogical_report_score if final_mark else 0,
                "taqdimot_slaydlari": final_mark.slides_score if final_mark else 0,
                "nashrlar": final_mark.publications_score if final_mark else 0,
                "kalendar_reja": final_mark.calendar_plan_score if final_mark else 0,
                "hemis_gpa": final_mark.academic_performance_score if final_mark else 0
            }
        } if final_mark else None,
        "tahrirlashlar_overrides": [
            {
                "komponent": o.component_name,
                "avvalgi_ball": o.original_score,
                "yangi_ball": o.override_score,
                "yozma_asos": o.justification
            }
            for o in overrides
        ],
        "apellatsiya_tarixi": [
            {
                "sana": a.filed_at.isoformat(),
                "asosi": a.grounds,
                "holati": a.status,
                "komissiya_xulosasi": a.commission_decision_notes or "-"
            }
            for a in appeals
        ]
    }

def generate_scientific_council_excel(db: Session, cycle_id: int) -> bytes:
    """
    FR-7.3 va FR-7.4: Ilmiy Kengash uchun yillik/semestrlik monitoring hisobotini Excel (XLSX) formatida generatsiya qilish.
    O'zbek tili lotin alifbosidagi barcha harflarni to'g'ri ifodalaydi.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Monitoring_Hisoboti"
    
    # Sarlavha
    cycle = db.query(MonitoringCycle).filter(MonitoringCycle.id == cycle_id).first()
    cycle_title = cycle.title if cycle else "Magistratura Semestrlik Monitoringi"
    
    ws.merge_cells("A1:K1")
    ws["A1"] = f"MAGISTRATURA TALABALARINING MONITORING VA BAHOLASH HISOBOTI — {cycle_title.upper()}"
    ws["A1"].font = Font(name="Arial", size=14, bold=True, color="1F2937")
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 35

    ws.merge_cells("A2:K2")
    ws["A2"] = "O‘zbekiston Respublikasi VMQ № 36 (02.03.2015) va ta’lim standartlari asosida"
    ws["A2"].font = Font(name="Arial", size=10, italic=True, color="4B5563")
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
    
    headers = [
        "№", "F.I.O.", "HEMIS ID", "Mutaxassislik", "Kurs",
        "Ilmiy hisobot (30%)", "Jonli taqdimot (20%)", "Pedagogik hisobot (15%)",
        "Slaydlar (10%)", "Nashr va Reja (20%)", "Umumiy Ball (100)", "Baho", "Reyting o'rni"
    ]
    
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    
    row_num = 4
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=row_num, column=col_num)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row_num].height = 28
    
    # Ma'lumotlarni to'ldirish
    final_marks = db.query(FinalMark).filter(
        FinalMark.cycle_id == cycle_id,
        FinalMark.is_active == True
    ).order_by(FinalMark.total_score.desc()).all()
    
    border_side = Side(border_style="thin", color="D1D5DB")
    cell_border = Border(left=border_side, right=border_side, top=border_side, bottom=border_side)
    
    for idx, mark in enumerate(final_marks, 1):
        student = db.query(User).filter(User.id == mark.student_id).first()
        pub_plan_total = round(mark.publications_score + mark.calendar_plan_score + mark.academic_performance_score, 1)
        
        row_values = [
            idx,
            student.full_name if student else "-",
            student.hemis_id if student else "-",
            student.specialty if student else "-",
            student.course_year if student else 1,
            mark.research_report_score,
            mark.live_presentation_score,
            mark.pedagogical_report_score,
            mark.slides_score,
            pub_plan_total,
            mark.total_score,
            f"{mark.grade_scale} ({mark.grade_label})",
            mark.rank_in_specialty or idx
        ]
        
        row_num += 1
        for col_num, val in enumerate(row_values, 1):
            cell = ws.cell(row=row_num, column=col_num)
            cell.value = val
            cell.border = cell_border
            cell.alignment = Alignment(horizontal="center" if col_num not in [2, 4] else "left", vertical="center")
            if col_num == 11:
                cell.font = Font(name="Arial", bold=True)
                
    # Ustun kengliklarini avtomatik moslash
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 11)
        
    output = BytesIO()
    wb.save(output)
    return output.getvalue()

def generate_evidence_pack_pdf(db: Session, student_id: int, cycle_id: int) -> bytes:
    """
    FR-7.1 va FR-7.4: Talabaning to'liq dalillar to'plami (Evidence Pack) PDF hujjati.
    Apellatsiya komissiyasi yoki vazirlik inspeksiyasiga taqdim etiladigan rasmiy hujjat.
    """
    data = build_student_evidence_pack_data(db, student_id, cycle_id)
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=16,
        leading=20,
        alignment=1, # Center
        textColor=colors.HexColor("#1E3A8A")
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        alignment=1,
        textColor=colors.HexColor("#4B5563")
    )
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1F2937"),
        spaceBefore=10,
        spaceAfter=6
    )
    normal_style = ParagraphStyle(
        'NormalText',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#374151")
    )

    story = []
    
    # 1. Sarlavha
    story.append(Paragraph("MAGISTRATURA MONITORING VA BAHOLASH HUJJATI", title_style))
    story.append(Paragraph("DALILLAR TO‘PLAMI (EVIDENCE PACK)", title_style))
    story.append(Paragraph(f"O‘zbekiston Respublikasi VMQ № 36 talablari bo‘yicha shakllantirildi | {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}", subtitle_style))
    story.append(Spacer(1, 15))
    
    # 2. Talaba ma'lumotlari jadvali
    student_table_data = [
        [Paragraph("<b>Talaba F.I.O.:</b>", normal_style), Paragraph(data["talaba_fio"], normal_style),
         Paragraph("<b>HEMIS ID:</b>", normal_style), Paragraph(str(data["hemis_id"]), normal_style)],
        [Paragraph("<b>Mutaxassislik:</b>", normal_style), Paragraph(data["mutaxassislik"], normal_style),
         Paragraph("<b>Kurs / Bosqich:</b>", normal_style), Paragraph(data["bosqich"], normal_style)],
        [Paragraph("<b>Ilmiy rahbar:</b>", normal_style), Paragraph(data["ilmiy_rahbar"], normal_style),
         Paragraph("<b>Monitoring tsikli:</b>", normal_style), Paragraph(data["tsikl_nomi"], normal_style)]
    ]
    t1 = Table(student_table_data, colWidths=[110, 150, 110, 150])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F9FAFB")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t1)
    story.append(Spacer(1, 10))

    # 3. Yakuniy baho xulosasi
    story.append(Paragraph("1. YAKUNIY MONITORING NATIJASI", section_style))
    mark = data["yakuniy_baho"]
    if mark:
        mark_table_data = [
            ["Umumiy Ball (100)", "Baho Shkalasi", "Natija", "Reyting o'rni", "Hujjat Versiyasi"],
            [f"{mark['umumiy_ball']} ball", f"{mark['baho_shkalasi']}", mark['baho_sozda'], mark['reyting_orni'], f"v{mark['versiya']}"]
        ]
        t2 = Table(mark_table_data, colWidths=[105, 105, 105, 105, 100])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E3A8A")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(t2)
        
        # Komponentlar taqsimoti
        story.append(Spacer(1, 6))
        comp = mark["komponentlar"]
        comp_data = [
            ["Ilmiy hisobot (30%)", "Jonli taqdimot (20%)", "Pedagogik hisobot (15%)", "Slaydlar (10%)", "Nashrlar (10%)", "Reja/Seminar (10%)", "GPA (5%)"],
            [f"{comp['ilmiy_hisobot']} b", f"{comp['jonli_taqdimot']} b", f"{comp['pedagogik_hisobot']} b", f"{comp['taqdimot_slaydlari']} b", f"{comp['nashrlar']} b", f"{comp['kalendar_reja']} b", f"{comp['hemis_gpa']} b"]
        ]
        t_comp = Table(comp_data, colWidths=[75, 75, 75, 75, 75, 75, 70])
        t_comp.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F3F4F6")),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E5E7EB")),
            ('FONTSIZE', (0,0), (-1,-1), 8),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_comp)
    else:
        story.append(Paragraph("Baho hali tasdiqlanmagan.", normal_style))
    story.append(Spacer(1, 10))

    # 4. Yuklangan artefaktlar va kriptografik xeshlar
    story.append(Paragraph("2. YUKLANGAN ARTEFAKTLAR VA KRIPTOGRAFIK XESHLAR (SHA-256)", section_style))
    art_rows = [["Artefakt turi", "Fayl nomi", "SHA-256 Kriptografik Xesh (Yaxlitlik kafolati)", "Versiya"]]
    for art in data["artefaktlar"]:
        art_rows.append([
            art["turi"],
            art["fayl_nomi"][:22] + "...",
            Paragraph(f"<font size=6>{art['sha256']}</font>", normal_style),
            f"v{art['versiya']}"
        ])
    if len(art_rows) > 1:
        t_art = Table(art_rows, colWidths=[100, 110, 260, 50])
        t_art.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E5E7EB")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_art)
    story.append(Spacer(1, 10))

    # 5. Jonli taqdimot va savol-javob bayonnomasi (Nizom 51-band)
    story.append(Paragraph("3. JONLI TAQDIMOT VA SAVOL-JAVOB BAYONNOMASI (VMQ 51-BAND)", section_style))
    sess = data["sessiya"]
    if sess:
        sess_p = Paragraph(f"<b>Holat:</b> {sess['holati']} | <b>Davomiyligi:</b> {sess['davomiyligi_soniya']} soniya<br/>"
                           f"<b>Savol-javob qaydlari:</b> {sess['savol_javob_qaydlari']}<br/>"
                           f"<b>Ishchi guruh tavsiyalari:</b> {sess['tavsiyalar']}", normal_style)
        story.append(sess_p)
    story.append(Spacer(1, 10))

    # 6. Belgilangan signallar (Flags) va xulosalar
    if data["signallar_flags"]:
        story.append(Paragraph("4. AKADEMIK HALOLLIK VA SESSIYA SIGNALLARI", section_style))
        flag_rows = [["Manba", "Signali turi", "Xavf", "Ko'rib chiqish holati", "Komissiya xulosasi"]]
        for fl in data["signallar_flags"]:
            flag_rows.append([fl["manba"], fl["turi"], fl["darajasi"], fl["holati"], fl["xulosa_izohi"]])
        t_flag = Table(flag_rows, colWidths=[80, 110, 60, 110, 160])
        t_flag.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#FEF3C7")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#F59E0B")),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_flag)
        story.append(Spacer(1, 10))

    # 7. Apellatsiya tarixi
    if data["apellatsiya_tarixi"]:
        story.append(Paragraph("5. APELLATSIYA JARAYONI VA QARORI (VMQ 45^1-45^5)", section_style))
        app_rows = [["Topshirilgan sana", "Talaba e'tiroz asosi", "Natija", "Komissiya bayonnomasi"]]
        for ap in data["apellatsiya_tarixi"]:
            app_rows.append([ap["sana"][:16], Paragraph(ap["asosi"], normal_style), ap["holati"], Paragraph(ap["komissiya_xulosasi"], normal_style)])
        t_app = Table(app_rows, colWidths=[90, 150, 80, 200])
        t_app.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E0E7FF")),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#6366F1")),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_app)
        
    doc.build(story)
    return buffer.getvalue()
