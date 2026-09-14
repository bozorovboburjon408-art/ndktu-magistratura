import React, { useState, useEffect, useRef } from 'react';
import { User, FinalMark } from '../types';
import { UZ_LABELS } from '../locales/uz';
import { LocalDatabase } from '../services/localDatabase';
import { ExcelExportService } from '../services/excelExportService';
import { ExcelImportService, ParsedStudentRow } from '../services/excelImportService';
import { PdfExportService } from '../services/pdfExportService';
import { NotificationService } from '../services/notificationService';
import { 
  Award, AlertTriangle, CheckCircle2, Download, 
  Send, Edit3, Shield, Users, ArrowRight, Upload,
  Database, FileSpreadsheet, Check, X, RefreshCw
} from 'lucide-react';

interface DepartmentHeadPanelProps {
  user: User;
}

export const DepartmentHeadPanel: React.FC<DepartmentHeadPanelProps> = ({ user }) => {
  const [cycleState, setCycleState] = useState<string>('SCORING');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedStudentForOverride, setSelectedStudentForOverride] = useState<any>(null);
  const [overrideScoreVal, setOverrideScoreVal] = useState<number>(25.0);
  const [overrideJustification, setOverrideJustification] = useState<string>('');

  // Ommaviy import (Excel) va Zaxira holati
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedImportRows, setParsedImportRows] = useState<ParsedStudentRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const loadStudentsData = () => {
    const rawUsers = LocalDatabase.getUsers().filter(u => u.role === 'talaba');
    const marks = LocalDatabase.getFinalMarks();
    return rawUsers.map(u => {
      const mark = marks.find(m => m.student_id === u.id && m.is_active);
      return {
        id: u.id,
        full_name: u.full_name,
        hemis_id: u.hemis_id || '3842100451',
        specialty: u.specialty || '70610101 - Kompyuter tizimlari',
        course_year: u.course_year || 1,
        total_score: mark?.total_score || 85.0,
        grade_scale: mark?.grade_scale || 4,
        grade_label: mark?.grade_label || 'Yaxshi',
        divergence_flag: mark?.divergence_flag || false,
        divergence_details: mark?.divergence_details || (mark?.divergence_flag ? "Baholovchilar o'rtasida 20 balldan ortiq og'ish aniqlandi." : null),
        rank: mark?.rank_in_specialty || 1,
        is_published: false
      };
    });
  };

  const [students, setStudents] = useState<any[]>(loadStudentsData);

  useEffect(() => {
    return LocalDatabase.subscribe(() => {
      setStudents(loadStudentsData());
    });
  }, []);

  const handleStateChange = (nextState: string) => {
    setCycleState(nextState);
    if (nextState === 'PUBLISHED') {
      setStudents(prev => prev.map(s => ({ ...s, is_published: true })));
      LocalDatabase.addAuditEntry(
        'CYCLE_STATE_CHANGED',
        'MONITORING_CYCLE',
        '1',
        "Kafedra mudiri monitoring baholarini rasman e'lon qildi (PUBLISHED). 72 soatlik apellatsiya oynasi ochildi.",
        user.id
      );
      NotificationService.success(
        "Monitoring baholari e'lon qilindi!",
        "Barcha talabalarga 72 soatlik apellatsiya oynasi ochildi (VMQ 45^2)."
      );
    } else {
      NotificationService.info(
        "Tsikl holati yangilandi",
        `Yangi holat: ${nextState}`
      );
    }
  };

  const handleApplyOverride = async () => {
    if (!overrideJustification || overrideJustification.trim().length < 10) {
      NotificationService.warning(
        "Asos yetarli emas",
        "Bahoni tahrirlash uchun kamida 10 ta belgidan iborat asosli izoh kiritish majburiy (FR-5.5)."
      );
      return;
    }

    const currentMark = LocalDatabase.getFinalMark(selectedStudentForOverride.id);
    if (currentMark) {
      currentMark.total_score = overrideScoreVal;
      currentMark.divergence_flag = false;
      currentMark.grade_scale = overrideScoreVal >= 86 ? 5 : overrideScoreVal >= 71 ? 4 : overrideScoreVal >= 60 ? 3 : 2;
      currentMark.grade_label = overrideScoreVal >= 86 ? "A'lo" : overrideScoreVal >= 71 ? "Yaxshi" : overrideScoreVal >= 60 ? "Qoniqarli" : "Qoniqarsiz";
      LocalDatabase.saveFinalMark(currentMark);
    }

    await LocalDatabase.addAuditEntry(
      'SCORE_OVERRIDE',
      'FINAL_MARK',
      String(selectedStudentForOverride.id),
      `Kafedra mudiri ${user.full_name} talaba ${selectedStudentForOverride.full_name} bahosini ${overrideScoreVal} ga o'zgartirdi (Override). Yozma asos: ${overrideJustification}`,
      user.id
    );

    setShowOverrideModal(false);
    setOverrideJustification('');
    NotificationService.success(
      "Baho muvaffaqiyatli tahrirlandi!",
      `${selectedStudentForOverride.full_name}: ${overrideScoreVal} ball (Audit jurnaliga qayd etildi).`
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    setImportErrors([]);
    try {
      const res = await ExcelImportService.parseStudentExcel(file);
      setParsedImportRows(res.students);
      setImportErrors(res.errors);
      if (res.students.length > 0) {
        NotificationService.info(
          "Fayl tahlil qilindi",
          `${res.students.length} nafar magistrant ma'lumoti aniqlandi.`
        );
      }
    } catch (err: any) {
      NotificationService.error("Excel xatoligi", err.message);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleCommitBulkImport = async () => {
    if (parsedImportRows.length === 0) return;
    try {
      const res = await LocalDatabase.bulkImportStudents(parsedImportRows, user.id);
      NotificationService.success(
        "Import muvaffaqiyatli yakunlandi!",
        `${res.addedCount} nafar yangi magistrant bazaga kiritildi. (O'tkazib yuborilgan dublikatlar: ${res.skippedDuplicates})`
      );
      setShowImportModal(false);
      setParsedImportRows([]);
      setImportErrors([]);
    } catch (err: any) {
      NotificationService.error("Bazaga kiritishda xatolik", err.message);
    }
  };

  const handleExportBackup = () => {
    try {
      const json = LocalDatabase.exportFullBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NDKTU_Magistratura_DB_Zaxirasi_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      NotificationService.success("Zaxira nusxa saqlandi", "Baza JSON fayli kompyuteringizga yuklandi.");
    } catch (err: any) {
      NotificationService.error("Zaxiralash xatosi", err.message);
    }
  };

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await LocalDatabase.importFullBackup(text, user.id);
      NotificationService.success("Baza tiklandi", "Zaxira nusxadagi barcha ma'lumotlar qayta yuklandi.");
    } catch (err: any) {
      NotificationService.error("Tiklashda xatolik", err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sarlavha va Tsikl Holati */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-purple-700" />
            <h2 className="text-lg font-bold text-slate-900">Magistratura Bo‘limi Boshlig‘i Paneli</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mas’ul shaxs: <span className="font-semibold text-slate-800">{user.full_name}</span> | 2025-2026 o‘quv yili, 2-semestr
          </p>
        </div>

        {/* Boshqaruv Tugmalari */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Yashirin fayl tanlagichlar */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <input
            type="file"
            ref={backupInputRef}
            onChange={handleRestoreBackupFile}
            accept=".json"
            className="hidden"
          />

          {/* Ommaviy Import Tugmasi */}
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg shadow transition active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Magistrantlarni Kiritish (Excel)</span>
          </button>

          {/* Excel Eksport Tugmasi (VMQ 52) */}
          <button
            onClick={() => ExcelExportService.exportCouncilReport()}
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-lg shadow transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Ilmiy Kengash Hisoboti (.xlsx)</span>
          </button>

          {/* Baza Zaxira Nusxasi (JSON Backup) */}
          <button
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2.5 rounded-lg shadow transition active:scale-95"
            title="Butun ma'lumotlar bazasini JSON formatida zaxiralash"
          >
            <Database className="w-4 h-4" />
            <span>Zaxiralash (JSON)</span>
          </button>

          {/* Zaxiradan tiklash */}
          <button
            onClick={() => backupInputRef.current?.click()}
            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-2.5 rounded-lg border border-slate-300 transition active:scale-95"
            title="JSON zaxira faylidan bazani qayta tiklash"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Tiklash</span>
          </button>
        </div>
      </div>

      {/* Monitoring Tsikli Holat Mashinasi (State Machine Stepper) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
          Monitoring Tsikli Bosqichlari (State Machine)
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
          {[
            { key: 'CYCLE_OPEN', name: '1. Tsikl Ochiq' },
            { key: 'SUBMISSION_OPEN', name: '2. Qabul Ochiq' },
            { key: 'SCREENED', name: '3. Tekshirildi' },
            { key: 'SCORING', name: '4. Baholashda' },
            { key: 'CONFIRMED', name: '5. Tasdiqlandi' },
            { key: 'PUBLISHED', name: '6. E‘lon Qilindi' },
            { key: 'CYCLE_CLOSED', name: '7. Arxivlandi' }
          ].map((st, idx) => {
            const isActive = cycleState === st.key;
            return (
              <button
                key={st.key}
                onClick={() => handleStateChange(st.key)}
                className={`p-2.5 rounded-lg border font-semibold transition ${
                  isActive
                    ? 'bg-purple-900 text-white border-purple-900 shadow'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Og'ishlar (Divergence > 20) Ogohlantirish Paneli */}
      {students.some(s => s.divergence_flag) && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-rose-900">
                  FR-5.3: Baholovchilar O‘rtasida 20 Balldan Ortiq Og‘ish (Divergence) Qayd Etildi!
                </h4>
                <p className="text-xs text-rose-800 mt-1">
                  Nizom talabiga muvofiq, bunday holatda baho avtomatik e’lon qilinmaydi. Bo‘lim boshlig‘i asosli yozma izoh bilan bahoni tahrirlashi (override) yoki kafedra muhokamasiga qo‘yishi shart.
                </p>
                
                {/* Og'ish bo'lgan talabalar */}
                <div className="mt-3 space-y-2">
                  {students.filter(s => s.divergence_flag).map(divStudent => (
                    <div key={divStudent.id} className="bg-white rounded-lg p-3 border border-rose-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{divStudent.full_name}</span> ({divStudent.specialty})
                        <p className="text-rose-700 font-medium text-[11px] mt-0.5">{divStudent.divergence_details}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStudentForOverride(divStudent);
                          setShowOverrideModal(true);
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg shadow"
                      >
                        Bahoni tahrirlash (Override)
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Magistrantlar Monitoring Ro'yxati */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Talabalar Natijalari va Reytingi</h3>
          </div>
          
          {cycleState !== 'PUBLISHED' && (
            <button
              onClick={() => handleStateChange('PUBLISHED')}
              className="bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold px-4 py-2 rounded-lg shadow flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Baholarni Tasdiqlash va E'lon Qilish (72h)</span>
            </button>
          )}
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3">O‘rni</th>
              <th className="p-3">Magistrant F.I.O.</th>
              <th className="p-3">HEMIS ID</th>
              <th className="p-3">Mutaxassislik</th>
              <th className="p-3">Bosqich</th>
              <th className="p-3">Umumiy Ball (100)</th>
              <th className="p-3">Baho</th>
              <th className="p-3">Og‘ish Holati</th>
              <th className="p-3 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {students.map((st) => (
              <tr key={st.id} className="hover:bg-slate-50">
                <td className="p-3 font-bold text-blue-900">#{st.rank}</td>
                <td className="p-3 font-semibold">{st.full_name}</td>
                <td className="p-3 font-mono text-slate-500">{st.hemis_id}</td>
                <td className="p-3 text-slate-600">{st.specialty}</td>
                <td className="p-3">{st.course_year}-kurs</td>
                <td className="p-3 font-black text-sm text-slate-900">{st.total_score} b</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                    st.grade_scale === 5 ? 'bg-emerald-100 text-emerald-800' :
                    st.grade_scale === 4 ? 'bg-blue-100 text-blue-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {st.grade_scale} — {st.grade_label}
                  </span>
                </td>
                <td className="p-3">
                  {st.divergence_flag ? (
                    <span className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Og‘ish bor (&gt; 20)
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Kelishilgan
                    </span>
                  )}
                </td>
                <td className="p-3 text-right space-x-2">
                  <button
                    onClick={() => {
                      setSelectedStudentForOverride(st);
                      setShowOverrideModal(true);
                    }}
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold"
                  >
                    Tahrirlash
                  </button>
                  <button
                    onClick={() => PdfExportService.exportEvidencePack(st.id)}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                  >
                    Dalillar (PDF)
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bahoni Tahrirlash (Override) Modali */}
      {showOverrideModal && selectedStudentForOverride && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-700" />
                <span>Bahoni Tahrirlash (FR-5.5 & A9)</span>
              </h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Talaba: <span className="font-bold text-slate-900">{selectedStudentForOverride.full_name}</span>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Yangi yakuniy umumiy ball (100 ballik shkalada):
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={overrideScoreVal}
                onChange={(e) => setOverrideScoreVal(parseFloat(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Majburiy Yozma Asos (FR-5.5 talabi — Dalillar to‘plami va Auditga yoziladi):
              </label>
              <textarea
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
                rows={4}
                placeholder="Baholovchilar o'rtasida 40 ballik tafovut bo'lganligi sababli, hisobot kafedrada qayta tahlil qilindi va talabaning dissertatsiya mustaqilligi inobatga olindi..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleApplyOverride}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow"
              >
                Asos bilan tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ommaviy Magistrantlar Kiritish Modali (Excel) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            
            {/* Modal Sarlavhasi */}
            <div className="flex items-center justify-between border-b pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Magistrantlarni Ommaviy Kiritish (Excel/CSV)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kafedra bo'yicha yangi magistrantlar ro'yxatini bazaga tezkor yuklash
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setParsedImportRows([]);
                  setImportErrors([]);
                }} 
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Tanasi */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              
              {/* 1-qadam: Shablonni olish */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-blue-900">1-qadam: Rasmiy Excel Shablonini Yuklab Olish</h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Ustunlar: F.I.SH, HEMIS ID, Mutaxassislik, Kurs, Email, Dissertatsiya mavzusi, Ilmiy rahbar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => ExcelImportService.downloadStudentTemplate()}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Shablon (.xlsx)</span>
                </button>
              </div>

              {/* 2-qadam: Faylni tanlash */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">2-qadam: To'ldirilgan Excel faylini yuklang</h4>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-xl p-6 text-center cursor-pointer transition"
                >
                  <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    Faylni tanlash uchun bu yerga bosing
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Qo'llab-quvvatlanadi: .xlsx, .xls, .csv
                  </p>
                </div>
              </div>

              {/* Xatoliklar ro'yxati (agar bo'lsa) */}
              {importErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Faylda quyidagi ogohlantirishlar aniqlandi:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {importErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3-qadam: O'qilgan magistrantlar ko'rigi (Preview) */}
              {parsedImportRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Aniqlangan magistrantlar ({parsedImportRows.length} nafar):</span>
                    </h4>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">№</th>
                          <th className="p-2">F.I.SH.</th>
                          <th className="p-2">HEMIS ID</th>
                          <th className="p-2">Kurs</th>
                          <th className="p-2">Mutaxassislik</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedImportRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-2 text-slate-500">{i + 1}</td>
                            <td className="p-2 font-semibold text-slate-800">{r.full_name}</td>
                            <td className="p-2 text-blue-700 font-mono text-[11px]">{r.hemis_id}</td>
                            <td className="p-2">{r.course_year}-kurs</td>
                            <td className="p-2 text-slate-600 text-[11px] truncate max-w-[180px]">{r.specialty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Tugmalari */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedImportRows([]);
                  setImportErrors([]);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleCommitBulkImport}
                disabled={parsedImportRows.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow transition"
              >
                <Check className="w-4 h-4" />
                <span>Baza (DB) ga saqlash ({parsedImportRows.length})</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
