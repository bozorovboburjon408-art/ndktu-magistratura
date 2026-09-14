import { User, Submission, FinalMark, Appeal, AuditEntry, CalendarItem } from '../types';
import { CryptoService } from './cryptoService';

export interface ScreeningData {
  submissionId: number;
  formatCheckPassed: boolean;
  formatCriteriaChecked: number;
  formatCriteriaTotal: number;
  plagiarismPercentage: number;
  plagiarismBand: 'yashil' | 'sariq' | 'qizil';
  aiIndicatorPercentage: number;
  matchedSources: { title: string; url: string; percentage: number }[];
  screenedAt: string;
}

export interface AssessorScoreRecord {
  assessorId: number;
  assessorName: string;
  studentId: number;
  component: string;
  scores: Record<number, number>; // criterionId -> score (0-5)
  comments: Record<number, string>; // criterionId -> justification
  qaNotes?: string;
  panelRecs?: string;
  submittedAt: string;
}

interface DatabaseSchema {
  users: User[];
  submissions: Submission[];
  screeningResults: Record<number, ScreeningData>; // submissionId -> ScreeningData
  finalMarks: FinalMark[];
  assessorScores: AssessorScoreRecord[];
  appeals: Appeal[];
  auditLogs: AuditEntry[];
  calendarPlans: CalendarItem[];
}

const STORAGE_KEY = 'magistratura_db_v2';

export class LocalDatabase {
  private static listeners: Array<() => void> = [];

  static subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.error('DB listener error:', e); }
    });
  }

  private static getInitialData(): DatabaseSchema {
    const users: User[] = [
      { 
        id: 1, 
        username: 'talaba1', 
        full_name: 'Bozorov Bobur Qudrat o‘g‘li', 
        role: 'talaba', 
        specialty: '70610101 – Kompyuter tizimlari va dasturiy injiniring', 
        course_year: 2, 
        hemis_id: '3842100451',
        email: 'b.bozorov@edu.uz'
      },
      { 
        id: 2, 
        username: 'talaba2', 
        full_name: 'Madina Rahimova', 
        role: 'talaba', 
        specialty: '70610101 – Kompyuter tizimlari va dasturiy injiniring', 
        course_year: 2, 
        hemis_id: '3842100452',
        email: 'm.rahimova@edu.uz'
      },
      { 
        id: 3, 
        username: 'talaba3', 
        full_name: 'Azizbek Yusupov', 
        role: 'talaba', 
        specialty: '70610102 - Sun’iy intellekt va robototexnika', 
        course_year: 1, 
        hemis_id: '3842100453',
        email: 'a.yusupov@edu.uz'
      },
      { 
        id: 10, 
        username: 'rahbar1', 
        full_name: 'Dotsent, t.f.n. A. Qodirov', 
        role: 'ilmiy_rahbar', 
        specialty: 'Dasturiy injiniring kafedrasi',
        email: 'a.qodirov@edu.uz'
      },
      { 
        id: 20, 
        username: 'baholovchi1', 
        full_name: 'Dots. Jamshid Nurmatov (PhD)', 
        role: 'baholovchi', 
        specialty: 'Dasturiy injiniring kafedrasi',
        email: 'j.nurmatov@edu.uz'
      },
      { 
        id: 21, 
        username: 'baholovchi2', 
        full_name: 'Dots. Nilufar Qosimova (PhD)', 
        role: 'baholovchi', 
        specialty: 'Axborot xavfsizligi kafedrasi',
        email: 'n.qosimova@edu.uz'
      },
      { 
        id: 30, 
        username: 'kafedra_mudiri', 
        full_name: 'Prof. Otabek Rustamov', 
        role: 'kafedra_mudiri', 
        specialty: 'Kompyuter injiniringi kafedrasi',
        email: 'o.rustamov@edu.uz'
      },
      { 
        id: 40, 
        username: 'apellatsiya1', 
        full_name: 'Prof. Sherzod Aliyev', 
        role: 'apellatsiya', 
        specialty: 'Akademik nazorat bo‘limi',
        email: 'sh.aliyev@edu.uz'
      },
      { 
        id: 50, 
        username: 'admin', 
        full_name: 'Tizim Administratori', 
        role: 'administrator',
        email: 'admin@edu.uz'
      },
      { 
        id: 60, 
        username: 'auditor', 
        full_name: 'Xavfsizlik Auditori', 
        role: 'auditor',
        email: 'audit@edu.uz'
      }
    ];

    const submissions: Submission[] = [
      {
        id: 1,
        student_id: 1,
        cycle_id: 1,
        artifact_type: 'ilmiy_hisobot',
        file_name: 'Bozorov_Bobur_Ilmiy_Natijalar_Hisoboti_2026.pdf',
        sha256_hash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
        file_size_bytes: 3421500,
        version_number: 1,
        uploaded_at: '2026-03-10T14:30:00.000Z',
        is_frozen: true,
        verification_method: 'yuz_biometrikasi'
      },
      {
        id: 2,
        student_id: 1,
        cycle_id: 1,
        artifact_type: 'taqdimot_slayd',
        file_name: 'Bozorov_Bobur_5_Daqiqalik_Taqdimot.pptx',
        sha256_hash: 'a94f58c732386bbd7a42ec3a1d95392cf99a80b06a524e4d7e8b625cf04b7713',
        file_size_bytes: 8740200,
        version_number: 1,
        uploaded_at: '2026-03-10T14:35:00.000Z',
        is_frozen: true,
        verification_method: 'yuz_biometrikasi'
      },
      {
        id: 3,
        student_id: 1,
        cycle_id: 1,
        artifact_type: 'pedagogik_hisobot',
        file_name: 'Bozorov_Bobur_Pedagogik_Amaliyot_Hisoboti.pdf',
        sha256_hash: 'bc51d8b2e3e1451fbc10688a2c14de552f462a632fa5a7702f5a6b0c27941322',
        file_size_bytes: 1950000,
        version_number: 1,
        uploaded_at: '2026-03-10T14:40:00.000Z',
        is_frozen: true,
        verification_method: 'yuz_biometrikasi'
      }
    ];

    const screeningResults: Record<number, ScreeningData> = {
      1: {
        submissionId: 1,
        formatCheckPassed: true,
        formatCriteriaChecked: 11,
        formatCriteriaTotal: 11,
        plagiarismPercentage: 8.4,
        plagiarismBand: 'yashil',
        aiIndicatorPercentage: 11.2,
        matchedSources: [
          { title: "Muhammed al-Xorazmiy avlodlari ilmiy jurnali, 2026", url: 'https://doi.org/10.37722/jhet.2026.01.014', percentage: 3.8 },
          { title: 'O\'zbekiston Milliy kutubxonasi dissertatsiyalar fondi', url: 'https://natlib.uz/dissertations', percentage: 2.9 },
          { title: 'IEEE Transactions on Learning Technologies, 2025', url: 'https://ieeexplore.ieee.org/document/10398', percentage: 1.7 }
        ],
        screenedAt: '2026-03-10T14:31:00.000Z'
      }
    };

    const finalMarks: FinalMark[] = [
      {
        id: 1,
        student_id: 1,
        cycle_id: 1,
        research_report_score: 29.0,
        live_presentation_score: 19.5,
        pedagogical_report_score: 14.5,
        slides_score: 9.8,
        publications_score: 10.0,
        calendar_plan_score: 10.0,
        academic_performance_score: 4.86,
        total_score: 97.66,
        grade_scale: 5,
        grade_label: "A'lo",
        divergence_flag: false,
        version_number: 1,
        is_active: true,
        rank_in_specialty: 1,
        total_in_specialty: 24,
        published_at: new Date(Date.now() - 3600000 * 18).toISOString()
      },
      {
        id: 2,
        student_id: 2,
        cycle_id: 1,
        research_report_score: 25.0,
        live_presentation_score: 17.5,
        pedagogical_report_score: 13.0,
        slides_score: 8.5,
        publications_score: 10.0,
        calendar_plan_score: 9.0,
        academic_performance_score: 4.2,
        total_score: 87.2,
        grade_scale: 5,
        grade_label: "A'lo",
        divergence_flag: false,
        version_number: 1,
        is_active: true,
        rank_in_specialty: 2,
        total_in_specialty: 24,
        published_at: new Date(Date.now() - 3600000 * 20).toISOString()
      },
      {
        id: 3,
        student_id: 3,
        cycle_id: 1,
        research_report_score: 21.0,
        live_presentation_score: 14.0,
        pedagogical_report_score: 11.5,
        slides_score: 7.0,
        publications_score: 5.0,
        calendar_plan_score: 8.0,
        academic_performance_score: 4.0,
        total_score: 70.5,
        grade_scale: 3,
        grade_label: "Qoniqarli",
        divergence_flag: true,
        divergence_details: "Baholovchilar o'rtasida 22 ball tafovut aniqlandi (A8)",
        version_number: 1,
        is_active: true,
        rank_in_specialty: 3,
        total_in_specialty: 24,
        published_at: new Date(Date.now() - 3600000 * 22).toISOString()
      }
    ];

    const assessorScores: AssessorScoreRecord[] = [
      {
        assessorId: 20,
        assessorName: 'Dots. Jamshid Nurmatov (PhD)',
        studentId: 1,
        component: 'ilmiy_hisobot',
        scores: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 4, 7: 5, 8: 5, 9: 5, 10: 5 },
        comments: {
          1: "Oliy ta'lim jarayonlarini raqamlashtirish strategiyasi va VMQ 36 talablariga to'liq mos.",
          2: "Talaba tadqiqot vazifalarini to'liq mustaqil yechgan va algoritmlarni ishlab chiqqan.",
          5: "Ko'p parametrli intellektual monitoring modeli kafedra amaliyotiga to'liq tatbiq qilingan.",
          8: "Nizom 26-29 bandlaridagi barcha zaruriy tarkibiy qismlar va 2 tildagi annotatsiya mavjud."
        },
        qaNotes: "Talaba ko'p parametrli intellektual monitoring modeli va taqsimlangan audit algoritmlari bo'yicha berilgan barcha savollarga empirik ma'lumotlar bilan yuqori ilmiy savodxonlikda mustaqil javob berdi.",
        panelRecs: "Magistrlik dissertatsiyasining amaliy natijalari kafedra o'quv jarayoniga to'liq tatbiq etilgan. Ish dastlabki himoyaga tavsiya etiladi.",
        submittedAt: '2026-03-12T11:00:00.000Z'
      }
    ];

    const appeals: Appeal[] = [
      {
        id: 1,
        student_id: 3,
        student_name: 'Azizbek Yusupov',
        cycle_id: 1,
        final_mark_id: 3,
        filed_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        grounds: "Pedagogik amaliyot hisobotidagi seminar darslari uchun ajratilgan ballar to'liq inobatga olinmagan.",
        target_component: 'Pedagogik amaliyot hisoboti (15%)',
        decision_deadline: new Date(Date.now() + 3600000 * 12).toISOString(),
        remaining_hours: 12,
        status: 'pending'
      }
    ];

    const auditLogs: AuditEntry[] = [
      {
        id: 1,
        action: 'CYCLE_OPENED',
        target_type: 'MONITORING_CYCLE',
        target_id: '1',
        details: '2025/2026-o\'quv yili 2-semestr magistratura monitoring tsikli tasdiqlandi',
        previous_hash: 'GENESIS_HASH_00000000000000000000000000000000000000000000000000000000',
        current_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        timestamp: '2026-03-01T09:00:00.000Z'
      },
      {
        id: 2,
        action: 'SUBMISSION_VERIFIED',
        target_type: 'SUBMISSION',
        target_id: '1',
        details: 'Talaba Bozorov Bobur ilmiy hisoboti yuklandi va SHA-256 xeshi (7f83b165...9069) saqlandi',
        previous_hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        current_hash: 'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a',
        timestamp: '2026-03-10T14:30:00.000Z'
      },
      {
        id: 3,
        action: 'FINAL_MARK_PUBLISHED',
        target_type: 'FINAL_MARK',
        target_id: '1',
        details: 'Bozorov Bobur Qudrat o‘g‘li uchun 97.66 ball e\'lon qilindi. 72 soatlik apellatsiya darchasi ochildi.',
        previous_hash: 'b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a',
        current_hash: 'c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef01a2b',
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString()
      }
    ];

    const calendarPlans: CalendarItem[] = [
      {
        id: 1,
        student_id: 1,
        cycle_id: 1,
        category: "Ilmiy-tadqiqot",
        description: "Magistrlik dissertatsiyasining 1-bob adabiyotlar tahlilini tayyorlash",
        planned_deadline: "2026-02-20",
        completed_date: "2026-02-18",
        status: "bajarildi",
        supervisor_confirmed: true,
        supervisor_comment: "Ko'p parametrli monitoring bo'yicha adabiyotlar tahlili to'liq bajarilgan"
      },
      {
        id: 2,
        student_id: 1,
        cycle_id: 1,
        category: "Pedagogik amaliyot",
        description: "Bakalavriat talabalariga 10 soat laboratoriya mashg'ulotlarini o'tkazish",
        planned_deadline: "2026-03-01",
        completed_date: "2026-02-27",
        status: "bajarildi",
        supervisor_confirmed: true,
        supervisor_comment: "Darslar jadval asosida to'liq hajmda o'tildi"
      },
      {
        id: 3,
        student_id: 1,
        cycle_id: 1,
        category: "Ilmiy nashrlar",
        description: "2 ta ilmiy maqola va konferensiya tezisini nashrga topshirish",
        planned_deadline: "2026-03-05",
        completed_date: "2026-03-02",
        status: "bajarildi",
        supervisor_confirmed: true,
        supervisor_comment: "Nashrlar OAK va xalqaro anjumanda muvaffaqiyatli chop etilgan"
      }
    ];

    return {
      users,
      submissions,
      screeningResults,
      finalMarks,
      assessorScores,
      appeals,
      auditLogs,
      calendarPlans
    };
  }

  static getDB(): DatabaseSchema {
    const initial = this.getInitialData();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error();
      return {
        users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : initial.users,
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : initial.submissions,
        screeningResults: parsed.screeningResults && typeof parsed.screeningResults === 'object' ? parsed.screeningResults : initial.screeningResults,
        finalMarks: Array.isArray(parsed.finalMarks) && parsed.finalMarks.length > 0 ? parsed.finalMarks : initial.finalMarks,
        assessorScores: Array.isArray(parsed.assessorScores) ? parsed.assessorScores : initial.assessorScores,
        appeals: Array.isArray(parsed.appeals) ? parsed.appeals : initial.appeals,
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : initial.auditLogs,
        calendarPlans: Array.isArray(parsed.calendarPlans) ? parsed.calendarPlans : initial.calendarPlans,
      };
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
  }

  private static saveDB(db: DatabaseSchema) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    this.notify();
  }

  static resetToDefault(): void {
    const initial = this.getInitialData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    this.notify();
  }

  // --- Foydalanuvchilar ---
  static getUsers(): User[] {
    return this.getDB().users;
  }

  static getUserById(id: number): User | undefined {
    return this.getDB().users.find(u => u.id === id);
  }

  // --- Topshiriqlar (Submissions) ---
  static getSubmissions(studentId?: number): Submission[] {
    const db = this.getDB();
    if (studentId) {
      return db.submissions.filter(s => s.student_id === studentId);
    }
    return db.submissions;
  }

  static async addSubmission(
    studentId: number,
    artifactType: 'taqdimot_slayd' | 'ilmiy_hisobot' | 'pedagogik_hisobot',
    file: File | { name: string; size: number; hash: string },
    verificationMethod: string = 'yuz_biometrikasi'
  ): Promise<Submission> {
    const db = this.getDB();
    
    let hash: string;
    let fileName: string;
    let fileSize: number;

    if (file instanceof File) {
      hash = await CryptoService.computeFileSha256(file);
      fileName = file.name;
      fileSize = file.size;
    } else {
      hash = file.hash;
      fileName = file.name;
      fileSize = file.size;
    }

    const existing = db.submissions.filter(s => s.student_id === studentId && s.artifact_type === artifactType);
    const versionNumber = existing.length > 0 ? Math.max(...existing.map(e => e.version_number)) + 1 : 1;

    const newSub: Submission = {
      id: Date.now(),
      student_id: studentId,
      cycle_id: 1,
      artifact_type: artifactType,
      file_name: fileName,
      sha256_hash: hash,
      file_size_bytes: fileSize,
      version_number: versionNumber,
      uploaded_at: new Date().toISOString(),
      is_frozen: true,
      verification_method: verificationMethod
    };

    // Eski versiyalarni almashtirish yoki yangisini qo'shish
    db.submissions = [newSub, ...db.submissions.filter(s => !(s.student_id === studentId && s.artifact_type === artifactType))];
    this.saveDB(db);

    // Kriptografik auditga yozish
    await this.addAuditEntry(
      'SUBMISSION_UPLOADED',
      'SUBMISSION',
      String(newSub.id),
      `Talaba ID:${studentId} "${artifactType}" faylini yukladi (v${versionNumber}). SHA-256: ${hash}`,
      studentId
    );

    return newSub;
  }

  // --- Screening (Antiplagiat / AI / Format) ---
  static getScreening(submissionId: number): ScreeningData | undefined {
    return this.getDB().screeningResults[submissionId];
  }

  static setScreening(submissionId: number, data: ScreeningData) {
    const db = this.getDB();
    db.screeningResults[submissionId] = data;
    this.saveDB(db);
  }

  // --- Yakuniy Baholar (FinalMarks) ---
  static getFinalMarks(): FinalMark[] {
    return this.getDB().finalMarks;
  }

  static getFinalMark(studentId: number): FinalMark | undefined {
    return this.getDB().finalMarks.find(m => m.student_id === studentId && m.is_active);
  }

  static saveFinalMark(mark: FinalMark) {
    const db = this.getDB();
    const index = db.finalMarks.findIndex(m => m.student_id === mark.student_id && m.is_active);
    if (index >= 0) {
      db.finalMarks[index] = mark;
    } else {
      db.finalMarks.push(mark);
    }
    // Reytinglarni qayta saralash
    db.finalMarks.sort((a, b) => b.total_score - a.total_score);
    db.finalMarks.forEach((m, idx) => {
      m.rank_in_specialty = idx + 1;
      m.total_in_specialty = db.finalMarks.length;
    });
    this.saveDB(db);
  }

  // --- Baholovchi Baholari (Assessor Scores) ---
  static getAssessorScores(studentId: number): AssessorScoreRecord[] {
    return this.getDB().assessorScores.filter(s => s.studentId === studentId);
  }

  static async saveAssessorScore(record: AssessorScoreRecord) {
    const db = this.getDB();
    const index = db.assessorScores.findIndex(
      s => s.studentId === record.studentId && s.assessorId === record.assessorId && s.component === record.component
    );
    if (index >= 0) {
      db.assessorScores[index] = record;
    } else {
      db.assessorScores.push(record);
    }

    // Yakuniy bahoni yangilash (agar ilmiy hisobot bo'lsa)
    const currentMark = db.finalMarks.find(m => m.student_id === record.studentId && m.is_active);
    if (currentMark) {
      const sum = Object.values(record.scores).reduce((a, b) => a + b, 0);
      const weightedResearch = Math.round(((sum / 50) * 30) * 10) / 10;
      currentMark.research_report_score = weightedResearch;
      currentMark.total_score = Math.round((
        currentMark.research_report_score +
        currentMark.live_presentation_score +
        currentMark.pedagogical_report_score +
        currentMark.slides_score +
        currentMark.publications_score +
        currentMark.calendar_plan_score +
        currentMark.academic_performance_score
      ) * 10) / 10;

      if (currentMark.total_score >= 86) {
        currentMark.grade_scale = 5;
        currentMark.grade_label = "A'lo";
      } else if (currentMark.total_score >= 71) {
        currentMark.grade_scale = 4;
        currentMark.grade_label = "Yaxshi";
      } else if (currentMark.total_score >= 60) {
        currentMark.grade_scale = 3;
        currentMark.grade_label = "Qoniqarli";
      } else {
        currentMark.grade_scale = 2;
        currentMark.grade_label = "Qoniqarsiz";
      }
    }

    this.saveDB(db);

    await this.addAuditEntry(
      'ASSESSMENT_SUBMITTED',
      'RUBRIC_SCORE',
      `STUDENT_${record.studentId}`,
      `${record.assessorName} talaba ID:${record.studentId} uchun baho qo'ydi (${record.component})`,
      record.assessorId
    );
  }

  // --- Apellatsiyalar ---
  static getAppeals(): Appeal[] {
    return this.getDB().appeals;
  }

  static async createAppeal(studentId: number, targetComponent: string, grounds: string): Promise<Appeal> {
    const db = this.getDB();
    const student = db.users.find(u => u.id === studentId);
    const finalMark = db.finalMarks.find(m => m.student_id === studentId && m.is_active);

    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 3600 * 1000); // 24 soatlik komissiya taymeri (VMQ 45^2)

    const appeal: Appeal = {
      id: Date.now(),
      student_id: studentId,
      student_name: student?.full_name || 'Noma\'lum talaba',
      cycle_id: 1,
      final_mark_id: finalMark?.id || 1,
      filed_at: now.toISOString(),
      grounds,
      target_component: targetComponent,
      decision_deadline: deadline.toISOString(),
      remaining_hours: 24,
      status: 'pending'
    };

    db.appeals.unshift(appeal);
    this.saveDB(db);

    await this.addAuditEntry(
      'APPEAL_FILED',
      'APPEAL',
      String(appeal.id),
      `Talaba ${appeal.student_name} apellatsiya arizasi topshirdi (Komponent: ${targetComponent}). 24 soatlik komissiya muddati boshlandi.`,
      studentId
    );

    return appeal;
  }

  static async decideAppeal(
    appealId: number,
    status: 'accepted' | 'rejected',
    scoreAdjustment: number,
    decisionNotes: string,
    commissionMember: string
  ) {
    const db = this.getDB();
    const appeal = db.appeals.find(a => a.id === appealId);
    if (!appeal) return;

    appeal.status = status;
    appeal.commission_decision_notes = decisionNotes;
    appeal.commission_members = commissionMember;
    appeal.decided_at = new Date().toISOString();

    if (status === 'accepted' && scoreAdjustment !== 0) {
      const mark = db.finalMarks.find(m => m.student_id === appeal.student_id && m.is_active);
      if (mark) {
        mark.total_score = Math.min(100, Math.max(0, mark.total_score + scoreAdjustment));
        mark.version_number += 1;
        if (mark.total_score >= 86) {
          mark.grade_scale = 5;
          mark.grade_label = "A'lo";
        } else if (mark.total_score >= 71) {
          mark.grade_scale = 4;
          mark.grade_label = "Yaxshi";
        } else if (mark.total_score >= 60) {
          mark.grade_scale = 3;
          mark.grade_label = "Qoniqarli";
        } else {
          mark.grade_scale = 2;
          mark.grade_label = "Qoniqarsiz";
        }
      }
    }

    this.saveDB(db);

    await this.addAuditEntry(
      status === 'accepted' ? 'APPEAL_ACCEPTED' : 'APPEAL_REJECTED',
      'APPEAL',
      String(appealId),
      `Apellatsiya #${appealId} ko'rib chiqildi: ${status === 'accepted' ? 'Qanoatlantirildi (Ball o\'zgarishi: +' + scoreAdjustment + ')' : 'Rad etildi'}. Izoh: ${decisionNotes}`,
      40
    );
  }

  // --- SHA-256 Zanjirli Audit Jurnali ---
  static getAuditLogs(): AuditEntry[] {
    return this.getDB().auditLogs;
  }

  static async addAuditEntry(
    action: string,
    targetType: string,
    targetId: string,
    details: string,
    actorId?: number
  ): Promise<AuditEntry> {
    const db = this.getDB();
    const lastEntry = db.auditLogs[db.auditLogs.length - 1];
    const previousHash = lastEntry ? lastEntry.current_hash : 'GENESIS_HASH_00000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();

    const blockString = `${previousHash}|${action}|${targetType}|${targetId}|${details}|${timestamp}|${actorId || 0}`;
    const currentHash = await CryptoService.computeStringSha256(blockString);

    const newEntry: AuditEntry = {
      id: db.auditLogs.length + 1,
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      previous_hash: previousHash,
      current_hash: currentHash,
      timestamp
    };

    db.auditLogs.push(newEntry);
    this.saveDB(db);
    return newEntry;
  }

  /**
   * Kriptografik yaxlitlikni tekshirish: Barcha SHA-256 zanjirini boshidan oxirigacha hisoblab chiqadi
   */
  static async verifyAuditIntegrity(): Promise<{ isValid: boolean; brokenAtId?: number }> {
    const logs = this.getAuditLogs();
    let prevHash = 'GENESIS_HASH_00000000000000000000000000000000000000000000000000000000';

    for (const entry of logs) {
      if (entry.previous_hash !== prevHash) {
        return { isValid: false, brokenAtId: entry.id };
      }
      const blockString = `${entry.previous_hash}|${entry.action}|${entry.target_type}|${entry.target_id}|${entry.details}|${entry.timestamp}|${entry.actor_id || 0}`;
      const expectedHash = await CryptoService.computeStringSha256(blockString);
      if (expectedHash !== entry.current_hash) {
        return { isValid: false, brokenAtId: entry.id };
      }
      prevHash = entry.current_hash;
    }
    return { isValid: true };
  }

  /**
   * Excel orqali ommaviy yangi magistrantlarni bazaga kiritish
   */
  static async bulkImportStudents(
    studentsToImport: Array<{
      full_name: string;
      hemis_id: string;
      specialty: string;
      course_year: number;
      email?: string;
      dissertation_topic?: string;
      supervisor_name?: string;
    }>,
    operatorUserId?: number
  ): Promise<{ addedCount: number; skippedDuplicates: number }> {
    const db = this.getDB();
    const existingHemisIds = new Set(db.users.map(u => u.hemis_id).filter(Boolean));
    
    let addedCount = 0;
    let skippedDuplicates = 0;
    let nextUserId = Math.max(...db.users.map(u => u.id), 0) + 1;
    let nextMarkId = Math.max(...db.finalMarks.map(m => m.id), 0) + 1;

    for (const item of studentsToImport) {
      if (existingHemisIds.has(item.hemis_id)) {
        skippedDuplicates++;
        continue;
      }

      const newUser: User = {
        id: nextUserId++,
        username: `magistr_${item.hemis_id}`,
        full_name: item.full_name,
        role: 'talaba',
        specialty: item.specialty,
        course_year: item.course_year || 1,
        hemis_id: item.hemis_id,
        email: item.email || `magistr_${item.hemis_id}@edu.uz`
      };

      db.users.push(newUser);
      existingHemisIds.add(item.hemis_id);

      // Boshlang'ich monitoring reyting ko'rsatkichi yaratish
      const newMark: FinalMark = {
        id: nextMarkId++,
        student_id: newUser.id,
        cycle_id: 1,
        research_report_score: 24.0,
        live_presentation_score: 16.0,
        pedagogical_report_score: 12.0,
        slides_score: 8.0,
        publications_score: 10.0,
        calendar_plan_score: 9.0,
        academic_performance_score: 4.1,
        total_score: 83.1,
        grade_scale: 4,
        grade_label: "Yaxshi",
        divergence_flag: false,
        version_number: 1,
        is_active: true,
        rank_in_specialty: db.users.filter(u => u.role === 'talaba').length,
        total_in_specialty: db.users.filter(u => u.role === 'talaba').length,
        published_at: new Date().toISOString()
      };

      db.finalMarks.push(newMark);
      addedCount++;
    }

    if (addedCount > 0) {
      // Reytinglarni qayta hisoblash
      const activeMarks = db.finalMarks.filter(m => m.is_active);
      activeMarks.sort((a, b) => b.total_score - a.total_score);
      activeMarks.forEach((m, idx) => {
        m.rank_in_specialty = idx + 1;
        m.total_in_specialty = activeMarks.length;
      });

      this.saveDB(db);
      await this.addAuditEntry(
        'BULK_STUDENT_IMPORT',
        'USERS_DATABASE',
        `${addedCount}`,
        `Kafedra tomonidan Excel orqali ${addedCount} nafar magistrant ma'lumotlar bazasiga ommaviy kiritildi. Dublikatlar: ${skippedDuplicates}`,
        operatorUserId
      );
      this.notify();
    }

    return { addedCount, skippedDuplicates };
  }

  /**
   * Butun ma'lumotlar bazasini JSON zaxira nusxa shaklida eksport qilish
   */
  static exportFullBackup(): string {
    const db = this.getDB();
    const payload = {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      institution: 'NDKTU',
      data: db
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Zaxira nusxa (JSON) dan bazani qayta tiklash
   */
  static async importFullBackup(jsonString: string, operatorUserId?: number): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      const dataToRestore: DatabaseSchema = parsed.data || parsed;
      if (!Array.isArray(dataToRestore.users) || !Array.isArray(dataToRestore.finalMarks)) {
        throw new Error("Noto'g'ri zaxira fayl strukturasi");
      }
      this.saveDB(dataToRestore);
      await this.addAuditEntry(
        'DATABASE_RESTORED',
        'FULL_BACKUP',
        '0',
        "Ma'lumotlar bazasi JSON zaxira nusxasidan to'liq tiklandi",
        operatorUserId
      );
      this.notify();
      return true;
    } catch (e: any) {
      console.error("Backup restore error:", e);
      throw e;
    }
  }
}
