import React, { useState, useEffect, useRef } from 'react';
import { User, Submission, FinalMark } from '../types';
import { UZ_LABELS } from '../locales/uz';
import { LocalDatabase, ScreeningData } from '../services/localDatabase';
import { CryptoService } from '../services/cryptoService';
import { ScreeningSimulator } from '../services/screeningSimulator';
import { PdfExportService } from '../services/pdfExportService';
import { NotificationService } from '../services/notificationService';
import { MonitoringTimeline } from './MonitoringTimeline';
import { AppealCountdownWidget } from './AppealCountdownWidget';
import { ScoreAnalyticsRadar } from './ScoreAnalyticsRadar';
import { 
  FileText, Upload, CheckCircle2, Clock, ShieldAlert, Award, 
  HelpCircle, Video, ArrowRight, FileCheck, AlertTriangle, Scale, Loader2, Download
} from 'lucide-react';

interface StudentPortalProps {
  user: User;
  onOpenLiveSession: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ user, onOpenLiveSession }) => {
  // Biometrik rozilik holati (O'RQ-547)
  const [biometricConsent, setBiometricConsent] = useState(true);
  const [activeTab, setActiveTab] = useState<'reja' | 'artefaktlar' | 'natija'>('artefaktlar');

  // LocalDatabase'dan ma'lumotlarni o'qish
  const [submissions, setSubmissions] = useState<Submission[]>(() => LocalDatabase.getSubmissions(user.id));
  const [finalMark, setFinalMark] = useState<FinalMark>(() => {
    return LocalDatabase.getFinalMark(user.id) || {
      id: 1,
      student_id: user.id,
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
    };
  });

  // Screening ma'lumotlari
  const [screening, setScreening] = useState<ScreeningData | undefined>(() => {
    const subs = LocalDatabase.getSubmissions(user.id);
    return subs.length > 0 ? LocalDatabase.getScreening(subs[0].id) : undefined;
  });

  // Haqiqiy fayl yuklash va Web Crypto SHA-256 xeshlash
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadType, setCurrentUploadType] = useState<'taqdimot_slayd' | 'ilmiy_hisobot' | 'pedagogik_hisobot'>('ilmiy_hisobot');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Apellatsiya formasi
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealComponent, setAppealComponent] = useState('Ilmiy natijalar hisoboti (30%)');
  const [appealGrounds, setAppealGrounds] = useState('');

  // LocalDatabase o'zgarganda ma'lumotlarni sinxronlash
  useEffect(() => {
    const unsubscribe = LocalDatabase.subscribe(() => {
      const updatedSubs = LocalDatabase.getSubmissions(user.id);
      setSubmissions(updatedSubs);
      const updatedMark = LocalDatabase.getFinalMark(user.id);
      if (updatedMark) setFinalMark(updatedMark);
      if (updatedSubs.length > 0) {
        setScreening(LocalDatabase.getScreening(updatedSubs[0].id));
      }
    });
    return unsubscribe;
  }, [user.id]);

  // Fayl tanlash darchasini ochish
  const handleTriggerUpload = (type: 'taqdimot_slayd' | 'ilmiy_hisobot' | 'pedagogik_hisobot') => {
    setCurrentUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Haqiqiy fayl tanlanganda Web Crypto SHA-256 va Antiplagiat simulyatsiyasi
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setProcessingStatus("Web Crypto API (crypto.subtle) yordamida haqiqiy SHA-256 xeshi hisoblanmoqda...");

    try {
      // 1. Web Crypto API orqali real xesh hisoblash va saqlash
      const newSub = await LocalDatabase.addSubmission(
        user.id,
        currentUploadType,
        file,
        biometricConsent ? 'yuz_biometrikasi' : 'oflayn_tasdiq'
      );

      // 2. Screening simulyatsiyasi (Antiplagiat + AI + Format)
      setProcessingStatus("Antiplagiat va AI tekshiruvi bajarilmoqda...");
      const screenRes = await ScreeningSimulator.runScreening(newSub, (stage) => {
        setProcessingStatus(stage);
      });

      setScreening(screenRes);
      NotificationService.success(
        "Fayl muvaffaqiyatli qabul qilindi",
        `${file.name} (SHA-256 va Antiplagiat tekshiruvi yakunlandi)`
      );
    } catch (err: any) {
      NotificationService.error("Fayl yuklashda xatolik", err.message);
      alert("Fayl yuklashda xatolik: " + err.message);
    } finally {
      setIsProcessingFile(false);
      setProcessingStatus('');
    }
  };

  // Klient tomonidagi rasmiy Dalillar To'plami (PDF) eksporti
  const handleDownloadEvidencePackPdf = async () => {
    setIsExportingPdf(true);
    try {
      await PdfExportService.exportEvidencePack(user.id);
    } catch (err: any) {
      NotificationService.error("PDF eksportida xatolik", err.message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Apellatsiya arizasini topshirish
  const handleSendAppeal = async () => {
    if (appealGrounds.trim().length < 15) {
      NotificationService.warning(
        "Talab bajarilmadi",
        "Apellatsiya asosi kamida 15 ta belgidan iborat bo'lishi kerak!"
      );
      return;
    }
    await LocalDatabase.createAppeal(user.id, appealComponent, appealGrounds);
    setShowAppealModal(false);
    setAppealGrounds('');
    NotificationService.warning(
      "Apellatsiya arizasi qabul qilindi",
      "VMQ 45^2-bandiga asosan 24 soatlik komissiya ko'rib chiqish taymeri boshlandi."
    );
  };

  const getSubByType = (type: 'taqdimot_slayd' | 'ilmiy_hisobot' | 'pedagogik_hisobot') => {
    return submissions.find(s => s.artifact_type === type);
  };

  const slideSub = getSubByType('taqdimot_slayd');
  const researchSub = getSubByType('ilmiy_hisobot');
  const pedSub = getSubByType('pedagogik_hisobot');

  return (
    <div className="space-y-6">
      
      {/* Yashirin fayl yuklash elementi */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
        accept=".pdf,.pptx,.docx,.doc"
      />

      {/* Yuklash jarayoni modali */}
      {isProcessingFile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 mx-auto flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Kriptografik Xeshlash va Tekshiruv</h3>
            <p className="text-xs text-slate-600">{processingStatus}</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      )}

      {/* Yuqori ma'lumot va Talaba Profili */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{user.full_name}</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {user.course_year || 1}-kurs Magistrant
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Mutaxassislik: <span className="font-medium text-slate-900">{user.specialty || "70610101 - Kompyuter tizimlari"}</span> | HEMIS ID: <span className="font-mono text-slate-900">{user.hemis_id || "3842100451"}</span>
          </p>
        </div>

        {/* 5 Daqiqalik Jonli Taqdimotga Kirish Tugmasi */}
        <button
          onClick={onOpenLiveSession}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-semibold px-5 py-3 rounded-lg shadow transition transform active:scale-95"
        >
          <Video className="w-5 h-5" />
          <span>5 Daqiqalik Jonli Taqdimot Xonasi</span>
        </button>
      </div>

      {/* 2. Talaba Yo'li: Semestr Monitoringi Bosqichlari (Interactive Stepper) */}
      <MonitoringTimeline />

      {/* Huquqiy va Xavfsizlik Paneli: O‘RQ-547 va Biometrik Rozilik */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {UZ_LABELS.notices.biometric_consent_title}
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {UZ_LABELS.notices.biometric_consent_desc}
              </p>
              <div className="mt-2 text-xs text-amber-900 font-semibold flex items-center gap-3">
                <span>Holat: {biometricConsent ? "✅ Biometrik tekshiruvga rozilik berilgan" : "⚠️ Oflayn topshirish yo‘li tanlangan"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setBiometricConsent(!biometricConsent)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 transition flex-shrink-0"
          >
            {biometricConsent ? "Rozilikni chaqirib olish" : "Biometrikaga rozilik berish"}
          </button>
        </div>
      </div>

      {/* Navigatsiya Tablari */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('artefaktlar')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'artefaktlar'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          1. Yuklangan Artefaktlar (3 ta talab)
        </button>
        <button
          onClick={() => setActiveTab('reja')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'reja'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          2. Kalendar Ish Reja (VMQ 14-band)
        </button>
        <button
          onClick={() => setActiveTab('natija')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'natija'
              ? 'border-blue-700 text-blue-800'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          3. Yakuniy Baho va Apellatsiya (100 ballik)
        </button>
      </div>

      {/* 1-TAB: ARTEFAKTLAR */}
      {activeTab === 'artefaktlar' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. Taqdimot slayd */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  Og'irligi: 10%
                </span>
                <span className="text-xs text-slate-500 font-mono">v{slideSub?.version_number || 1}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">Taqdimot Slaydlari</h3>
              <p className="text-xs text-slate-500 mt-1">.pptx yoki .pdf formatda 5 daqiqalik namoyish uchun</p>
              
              <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1 text-xs">
                <p className="font-medium text-slate-700 truncate">{slideSub?.file_name || 'Taqdimot yuklanmagan'}</p>
                <p className="text-slate-400 font-mono text-[10px] truncate">
                  SHA-256: {slideSub?.sha256_hash ? `${slideSub.sha256_hash.slice(0, 18)}...${slideSub.sha256_hash.slice(-6)}` : 'Mavjud emas'}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500 text-[10px] font-mono">
                    Hajmi: {CryptoService.formatBytes(slideSub?.file_size_bytes || 4200000)}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tasdiqlangan</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleTriggerUpload('taqdimot_slayd')}
              className="mt-5 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Haqiqiy fayl yuklash (SHA-256)</span>
            </button>
          </div>

          {/* 2. Ilmiy hisobot */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  Og'irligi: 30%
                </span>
                <span className="text-xs text-slate-500 font-mono">v{researchSub?.version_number || 1}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">Ilmiy Natijalar Hisoboti</h3>
              <p className="text-xs text-slate-500 mt-1">Nizom 44-banddagi 7 ta mezon va 26-33 format talablari</p>
              
              <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1 text-xs">
                <p className="font-medium text-slate-700 truncate">{researchSub?.file_name || 'Hisobot yuklanmagan'}</p>
                <p className="text-slate-400 font-mono text-[10px] truncate">
                  SHA-256: {researchSub?.sha256_hash ? `${researchSub.sha256_hash.slice(0, 18)}...${researchSub.sha256_hash.slice(-6)}` : 'Mavjud emas'}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className={`font-semibold text-[11px] px-1.5 py-0.5 rounded ${
                    (screening?.plagiarismPercentage || 11.4) <= 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Plagiat: {screening?.plagiarismPercentage || 11.4}%
                  </span>
                  <span className="text-slate-600 font-semibold text-[11px]">
                    AI indikator: {screening?.aiIndicatorPercentage || 6.2}%
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleTriggerUpload('ilmiy_hisobot')}
              className="mt-5 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Haqiqiy fayl yuklash (SHA-256)</span>
            </button>
          </div>

          {/* 3. Pedagogik hisobot */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Og'irligi: 15%
                </span>
                <span className="text-xs text-slate-500 font-mono">v{pedSub?.version_number || 1}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-2">Pedagogik Amaliyot Hisoboti</h3>
              <p className="text-xs text-slate-500 mt-1">O'tkazilgan darslar, o'quv-uslubiy ishlanmalar va baholash</p>
              
              <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-1 text-xs">
                <p className="font-medium text-slate-700 truncate">{pedSub?.file_name || 'Hisobot yuklanmagan'}</p>
                <p className="text-slate-400 font-mono text-[10px] truncate">
                  SHA-256: {pedSub?.sha256_hash ? `${pedSub.sha256_hash.slice(0, 18)}...${pedSub.sha256_hash.slice(-6)}` : 'Mavjud emas'}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500 text-[10px] font-mono">
                    Hajmi: {CryptoService.formatBytes(pedSub?.file_size_bytes || 1800000)}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tekshiruvdan o'tgan</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleTriggerUpload('pedagogik_hisobot')}
              className="mt-5 w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Haqiqiy fayl yuklash (SHA-256)</span>
            </button>
          </div>

        </div>
      )}

      {/* 2-TAB: KALENDAR ISH REJA */}
      {activeTab === 'reja' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Individual Kalendar Ish Reja Bandlari (VMQ № 36 14–15 bandlar)
            </h3>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
              Bajarilish: 100% (2/2)
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3">Toifa</th>
                <th className="p-3">Tadbir tavsifi</th>
                <th className="p-3">Muddati</th>
                <th className="p-3">Holati</th>
                <th className="p-3">Ilmiy rahbar tasdig'i</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              <tr>
                <td className="p-3 font-semibold text-blue-800">Ilmiy-tadqiqot</td>
                <td className="p-3">Magistrlik dissertatsiyasining 1-bob adabiyotlar tahlilini tayyorlash</td>
                <td className="p-3">2026-02-20</td>
                <td className="p-3"><span className="text-emerald-700 font-bold">Bajarildi (2026-02-18)</span></td>
                <td className="p-3 text-slate-600">Tasdiqlandi (Dots. A. Qodirov)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-emerald-800">Pedagogik amaliyot</td>
                <td className="p-3">Bakalavriat talabalariga 10 soat laboratoriya mashg'ulotlarini o'tkazish</td>
                <td className="p-3">2026-03-01</td>
                <td className="p-3"><span className="text-emerald-700 font-bold">Bajarildi (2026-02-27)</span></td>
                <td className="p-3 text-slate-600">Tasdiqlandi (Dots. A. Qodirov)</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-indigo-800">Ilmiy nashr</td>
                <td className="p-3">2 ta ilmiy maqolani nufuzli tahririyatlarga nashrga topshirish</td>
                <td className="p-3">2026-03-05</td>
                <td className="p-3"><span className="text-emerald-700 font-bold">Bajarildi (2026-03-02)</span></td>
                <td className="p-3 text-slate-600">Tasdiqlandi (OAK va xalqaro)</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 3-TAB: NATIJA VA APELLATSIYA */}
      {activeTab === 'natija' && (
        <div className="space-y-6">
          
          {/* Yakuniy Baho Kartasi */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
                  Semestrlik Monitoring Yakuniy Bahosi
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-5xl font-black">{finalMark.total_score}</span>
                  <span className="text-xl text-blue-200">/ 100 ball</span>
                  <span className="bg-emerald-500 text-white font-bold text-sm px-3 py-1 rounded-full shadow">
                    Baho: {finalMark.grade_scale} — {finalMark.grade_label}
                  </span>
                </div>
                <p className="text-xs text-blue-200 mt-2">
                  Mutaxassislik bo‘yicha reyting o‘rni: <span className="font-bold text-white text-sm">{finalMark.rank_in_specialty || 1}-o‘rin</span> (jami {finalMark.total_in_specialty || 24} ta talabadan)
                </p>
              </div>

              {/* 72 soatlik Apellatsiya Taymeri (Real-vaqt hisoblagich) */}
              <div className="w-full md:w-80">
                <AppealCountdownWidget
                  publishedAtIso={finalMark.published_at || new Date().toISOString()}
                  onOpenAppealModal={() => setShowAppealModal(true)}
                />
              </div>
            </div>

            {/* 7 ta komponent balining taqsimoti */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mt-6 pt-6 border-t border-white/15 text-center">
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[11px] text-blue-200 truncate">Ilmiy hisobot (30%)</p>
                <p className="text-base font-bold text-white mt-1">{finalMark.research_report_score} b</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[11px] text-blue-200 truncate">Jonli taqdimot (20%)</p>
                <p className="text-base font-bold text-white mt-1">{finalMark.live_presentation_score} b</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[11px] text-blue-200 truncate">Pedagogik (15%)</p>
                <p className="text-base font-bold text-white mt-1">{finalMark.pedagogical_report_score} b</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[11px] text-blue-200 truncate">Slaydlar (10%)</p>
                <p className="text-base font-bold text-white mt-1">{finalMark.slides_score} b</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[11px] text-blue-200 truncate">Nashrlar (10%)</p>
                <p className="text-base font-bold text-white mt-1">{finalMark.publications_score} b</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[11px] text-blue-200 truncate">Reja (10%)</p>
                <p className="text-base font-bold text-white mt-1">{finalMark.calendar_plan_score} b</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5">
                <p className="text-[11px] text-blue-200 truncate">HEMIS GPA (5%)</p>
                <p className="text-base font-bold text-white mt-1">{finalMark.academic_performance_score} b</p>
              </div>
            </div>
          </div>

          {/* 7 Ta Komponent Bo'yicha Vizual Radar Diagrammasi */}
          <ScoreAnalyticsRadar mark={finalMark} />

          {/* Rasmiy Dalillar to'plami yuklab olish (Klient jsPDF generatori) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-blue-700 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900">Talabaning Rasmiy Dalillar To‘plami (Evidence Pack)</h4>
                <p className="text-xs text-slate-500">SHA-256 xeshlari, rubrika ballari, taqdimot qaydlari va audit tasdig‘i bilan PDF formatda</p>
              </div>
            </div>
            <button
              onClick={handleDownloadEvidencePackPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition self-stretch sm:self-auto justify-center"
            >
              {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExportingPdf ? "PDF shakllanmoqda..." : "PDF Yuklab olish (jsPDF)"}</span>
            </button>
          </div>

        </div>
      )}

      {/* Apellatsiya berish modali */}
      {showAppealModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-5 h-5 text-rose-600" />
                <span>Apellatsiya arizasi berish (VMQ 45^2-band)</span>
              </h3>
              <button onClick={() => setShowAppealModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Baho e’lon qilingandan so‘ng 72 soat ichida talaba norozilik bildirishi mumkin. Apellatsiya komissiyasi ushbu arizani 24 soat ichida ko‘rib chiqib, qaror bayonnomasini rasmiylashtirishi shart.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                E'tiroz bildirilayotgan rubrika komponenti:
              </label>
              <select
                value={appealComponent}
                onChange={(e) => setAppealComponent(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
              >
                <option>Ilmiy natijalar hisoboti (30%)</option>
                <option>Jonli taqdimot va Q&A (20%)</option>
                <option>Pedagogik amaliyot hisoboti (15%)</option>
                <option>Taqdimot slaydlari (10%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                E'tiroz asosi va dalillar (Batafsil yozma asos):
              </label>
              <textarea
                value={appealGrounds}
                onChange={(e) => setAppealGrounds(e.target.value)}
                rows={4}
                placeholder="Hisobotimdagi qaysi ilmiy natijalar yoki taqdimotdagi qaysi javoblar inobatga olinmaganligini asoslab bering..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAppealModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSendAppeal}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow"
              >
                Arizani yuborish (72 soat darchasida)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
