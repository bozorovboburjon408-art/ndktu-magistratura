import * as XLSX from 'xlsx';
import { LocalDatabase } from './localDatabase';
import { NotificationService } from './notificationService';

export class ExcelExportService {
  /**
   * Ilmiy Kengash uchun rasmiy monitoring bayonnomasi (XLSX)ni brauzerda hosil qilish va yuklab berish
   */
  static async exportCouncilReport(): Promise<void> {
    const finalMarks = LocalDatabase.getFinalMarks();
    const students = LocalDatabase.getUsers().filter(u => u.role === 'talaba');
    const appeals = LocalDatabase.getAppeals();

    // Qatorlarni shakllantirish
    const rows = finalMarks.map((m, index) => {
      const student = students.find(s => s.id === m.student_id);
      const studentAppeal = appeals.find(a => a.student_id === m.student_id);
      const appealText = studentAppeal
        ? (studentAppeal.status === 'accepted' ? "Qanoatlantirilgan" : studentAppeal.status === 'pending' ? "Ko'rib chiqilmoqda" : "Rad etilgan")
        : "Yo'q";

      return {
        "№": index + 1,
        "Magistrant F.I.SH.": student?.full_name || `Talaba #${m.student_id}`,
        "Mutaxassislik": student?.specialty || "Kompyuter tizimlari va tarmoqlari",
        "Kurs": `${student?.course_year || 1}-kurs`,
        "HEMIS ID": student?.hemis_id || "3842100451",
        "Ilmiy hisobot (30%)": m.research_report_score,
        "Jonli taqdimot (20%)": m.live_presentation_score,
        "Pedagogik (15%)": m.pedagogical_report_score,
        "Slaydlar (10%)": m.slides_score,
        "Nashrlar (10%)": m.publications_score,
        "Kalendar reja (10%)": m.calendar_plan_score,
        "HEMIS GPA (5%)": m.academic_performance_score,
        "JAMI (100 ball)": m.total_score,
        "Akademik Baho": m.grade_label,
        "Baho shkalasi": m.grade_scale,
        "Reyting o'rni": `${m.rank_in_specialty || index + 1}-o'rin`,
        "Apellatsiya": appealText
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Ustun kengliklarini avtomatik moslash
    worksheet['!cols'] = [
      { wch: 5 },   // №
      { wch: 28 },  // F.I.SH.
      { wch: 38 },  // Mutaxassislik
      { wch: 10 },  // Kurs
      { wch: 14 },  // HEMIS ID
      { wch: 18 },  // Ilmiy hisobot
      { wch: 18 },  // Jonli taqdimot
      { wch: 16 },  // Pedagogik
      { wch: 14 },  // Slaydlar
      { wch: 14 },  // Nashrlar
      { wch: 18 },  // Reja
      { wch: 14 },  // GPA
      { wch: 16 },  // Jami
      { wch: 15 },  // Akademik baho
      { wch: 14 },  // Baho shkalasi
      { wch: 15 },  // Reyting
      { wch: 18 }   // Apellatsiya
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monitoring Natijalari");

    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `Ilmiy_Kengash_Monitoring_Bayonnomasi_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    NotificationService.success(
      "Excel hisoboti tayyorlandi",
      `Ilmiy Kengash monitoring bayonnomasi (${finalMarks.length} ta magistrant) muvaffaqiyatli yuklab olindi.`
    );

    await LocalDatabase.addAuditEntry(
      'COUNCIL_REPORT_EXPORTED',
      'EXCEL_EXPORT',
      'ALL_STUDENTS',
      `Ilmiy Kengash hisoboti (XLSX) eksport qilindi. Jami magistrantlar soni: ${finalMarks.length}`,
      30
    );
  }
}
