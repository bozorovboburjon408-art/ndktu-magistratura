import React, { useState } from 'react';
import { User } from '../types';
import { 
  CheckCircle, AlertCircle, EyeOff, Save, 
  HelpCircle, UserCheck, MessageSquare, BookOpen,
  FileText, Presentation, GraduationCap, ShieldCheck, 
  ExternalLink, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Maximize2, Video
} from 'lucide-react';

import { LocalDatabase } from '../services/localDatabase';
import { PdfExportService } from '../services/pdfExportService';
import { NotificationService } from '../services/notificationService';

interface AssessorWorkbenchProps {
  user: User;
}

export const AssessorWorkbench: React.FC<AssessorWorkbenchProps> = ({ user }) => {
  const students = LocalDatabase.getUsers().filter(u => u.role === 'talaba');
  // Tanlangan magistrant
  const [selectedStudentId, setSelectedStudentId] = useState<number>(students[0]?.id || 1);
  const [activeComponent, setActiveComponent] = useState<string>('ilmiy_hisobot');

  // Chap paneldagi hujjat ko'rish tablari
  const [viewerTab, setViewerTab] = useState<'ilmiy_pdf' | 'slaydlar' | 'pedagogik_pdf' | 'plagiat' | 'video'>('ilmiy_pdf');
  const [docPage, setDocPage] = useState<number>(1);
  const totalDocPages = 76;

  // Mezonlar bo'yicha qo'yilgan ballar va izohlar
  const [scores, setScores] = useState<Record<number, number>>({
    1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5, 10: 4
  });
  const [comments, setComments] = useState<Record<number, string>>({
    1: "Dolzarbligi va amaliy ahamiyati to'liq asoslangan.",
    2: "Talaba tadqiqot vazifalarini to'liq mustaqil bajargan.",
    5: "Berilgan tavsiyalar OTM o'quv jarayoniga joriy etishga tayyor.",
    8: "Nizom 26-29 bandlaridagi barcha zaruriy tarkibiy qismlar mavjud.",
    9: "76 bet hajm, 1.5 interval, Times New Roman 12pt format talablariga to'liq mos."
  });

  // Nizom 51-band: Savol-javob va tavsiyalar
  const [qaNotes, setQaNotes] = useState("Talaba dissertatsiya mavzusi, taklif etilgan ko'p parametrli intellektual model va proktoring tizimi bo'yicha berilgan savollarga to'liq, chuqur va mustaqil javob berdi.");
  const [panelRecs, setPanelRecs] = useState("VMQ 51-band talablariga to'liq mos keladi. Natijalar OTM o'quv jarayonlariga tavsiya etilsin.");

  // Mezonlar ro'yxati (10 ta ilmiy hisobot mezoni)
  const criteriaList = [
    { id: 1, num: 1, name: "Tadqiqot mavzusining dolzarbligi va amaliyot bilan bog'liqligi", clause: "VMQ 44-band" },
    { id: 2, num: 2, name: "Tadqiqot vazifalarini yechishda talabaning mustaqilligi", clause: "VMQ 44-band" },
    { id: 3, num: 3, name: "Adabiyotlar, xorijiy manbalar va statistikani tanqidiy tahlil qilish chuqurligi", clause: "VMQ 44-band" },
    { id: 4, num: 4, name: "Qo'llanilgan tadqiqot usullari va metodologiyaning asoslanganligi", clause: "VMQ 44-band" },
    { id: 5, num: 5, name: "Olingan natijalar asosida berilgan amaliy tavsiyalarning ahamiyati", clause: "VMQ 44-band" },
    { id: 6, num: 6, name: "Tadqiqot natijalarining kelgusidagi rivojlanish istiqbollarini ko'ra bilish", clause: "VMQ 44-band" },
    { id: 7, num: 7, name: "Nazariy va amaliy qismlarning mantiqiy izchilligi", clause: "VMQ 44-band" },
    { id: 8, num: 8, name: "Tuzilmaviy to'liqlik (titul, annotatsiya, mundarija, kirish, 3 bob, xulosa)", clause: "VMQ 26-29 bandlar" },
    { id: 9, num: 9, name: "Format talablariga moslik (hajm 70-80 bet, 1.5 interval, hoshiyalar)", clause: "VMQ 30, 32-33 bandlar" },
    { id: 10, num: 10, name: "Iqtiboslar to'g'riligi va adabiyotlar ro'yxatining haqqoniyligi", clause: "VMQ 31-band" }
  ];

  const handleScoreChange = (critId: number, val: number) => {
    setScores(prev => ({ ...prev, [critId]: val }));
  };

  const handleCommentChange = (critId: number, text: string) => {
    setComments(prev => ({ ...prev, [critId]: text }));
  };

  const calculateSubtotal = () => {
    const sum = Object.values(scores).reduce((a, b) => a + b, 0);
    const weighted = (sum / 50) * 30; // 50 ball -> 30% og'irlik
    return { sum, weighted: Math.round(weighted * 10) / 10 };
  };

  const handleSubmitScores = async () => {
    for (const c of criteriaList) {
      const val = scores[c.id];
      if ((val <= 2 || val === 5) && (!comments[c.id] || comments[c.id].trim().length < 5)) {
        NotificationService.warning(
          "Asosli izoh talab qilinadi",
          `"${c.name}" (${val} ball) uchun VMQ talabiga binoan izoh yozilishi shart`
        );
        return;
      }
    }

    await LocalDatabase.saveAssessorScore({
      assessorId: user.id,
      assessorName: user.full_name,
      studentId: selectedStudentId,
      component: activeComponent,
      scores,
      comments,
      qaNotes,
      panelRecs,
      submittedAt: new Date().toISOString()
    });

    const sub = calculateSubtotal();
    NotificationService.success(
      "Ballar muvaffaqiyatli saqlandi!",
      `Jami: ${sub.sum} ball (30% og'irlikda: ${sub.weighted} ball). Xolis baholash qayd etildi.`
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Yuqori boshqaruv paneli */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-900 flex items-center justify-center text-white shadow">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Baholash Ish Stoli (Split-Screen Workbench)
            </h2>
            <p className="text-xs text-slate-500">
              Baholovchi: <b className="text-slate-800">{user.full_name}</b> | Rektor buyrug‘i bo‘yicha Ishchi guruh
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Magistrantni tanlash */}
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
            <span className="text-xs font-semibold text-slate-600 mr-2">Magistrant:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.course_year}-kurs, {s.specialty})
                </option>
              ))}
            </select>
          </div>

          {/* Xolis baholash nishoni */}
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
            <span>Xolis (ko‘r) baholash faol</span>
          </div>
        </div>
      </div>

      {/* SPLIT-SCREEN EKRAN: CHAPDA HUJJAT / O'NGDA RUBRIKA FORMASI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ========================================================= */}
        {/* CHAP PANEL (6 / 12): YUKLANGAN HUJJAT VA ARTEFAKTLAR     */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[750px]">
          
          {/* Hujjat turlari tablari */}
          <div className="bg-slate-100/80 border-b border-slate-200 p-2 flex items-center justify-between gap-1 overflow-x-auto">
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setViewerTab('ilmiy_pdf')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewerTab === 'ilmiy_pdf' 
                    ? 'bg-white text-blue-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-700" />
                <span>Ilmiy hisobot (.pdf)</span>
              </button>

              <button
                onClick={() => setViewerTab('slaydlar')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewerTab === 'slaydlar' 
                    ? 'bg-white text-blue-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Presentation className="w-3.5 h-3.5 text-indigo-700" />
                <span>Slaydlar (.pptx)</span>
              </button>

              <button
                onClick={() => setViewerTab('plagiat')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewerTab === 'plagiat' 
                    ? 'bg-white text-blue-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Plagiat & AI</span>
              </button>

              <button
                onClick={() => setViewerTab('video')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewerTab === 'video' 
                    ? 'bg-white text-blue-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-rose-700" />
                <span>Jonli sessiya</span>
              </button>
            </div>

            {/* Sahifa navigatsiyasi */}
            {viewerTab === 'ilmiy_pdf' && (
              <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
                <button 
                  onClick={() => setDocPage(p => Math.max(1, p - 1))}
                  disabled={docPage === 1}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span>{docPage}/{totalDocPages}</span>
                <button 
                  onClick={() => setDocPage(p => Math.min(totalDocPages, p + 1))}
                  disabled={docPage === totalDocPages}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* HUJJATNING ASOSIY MATNI / VIZUAL KO'RINIShI */}
          <div className="flex-1 p-6 bg-slate-50/60 overflow-y-auto max-h-[700px] font-serif text-slate-800 text-xs leading-relaxed space-y-4">
            
            {viewerTab === 'ilmiy_pdf' && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="text-center border-b pb-4">
                  <p className="text-[10px] uppercase font-sans text-slate-500 tracking-wider">
                    O‘ZBEKISTON RESPUBLIKASI OLIY TA’LIM, FAN VA INNOVATSIYALAR VAZIRLIGI
                  </p>
                  <h3 className="text-sm font-bold font-sans text-slate-900 mt-2 uppercase">
                    Oliy ta'lim jarayonlarida talabalar faoliyatini monitoring qilish va intellektual baholash tizimlarini ishlab chiqish
                  </h3>
                  <p className="text-xs text-slate-600 font-sans mt-1">
                    Mutaxassislik: 70610101 – Kompyuter tizimlari va dasturiy injiniring
                  </p>
                  <p className="text-[11px] text-slate-500 font-sans mt-1">
                    Magistrant: Bozorov Bobur Qudrat o‘g‘li | Ilmiy rahbar: Dotsent, t.f.n. A. Qodirov
                  </p>
                </div>

                {/* Nizom 26-band: Ikki tildagi annotatsiya */}
                <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100 font-sans text-[11px] space-y-2">
                  <div>
                    <b className="text-blue-900">Annotatsiya (O‘zbek tilida):</b>
                    <p className="text-slate-700 mt-0.5">
                      Ushbu tadqiqotda oliy ta'lim muassasalarida magistrantlar faoliyatini semestrlik monitoring qilish, ko'p parametrli intellektual baholash modellari, Web Crypto SHA-256 zanjirli audit va masofaviy biometrik proktoring texnologiyalari ishlab chiqilgan.
                    </p>
                  </div>
                  <div>
                    <b className="text-blue-900">Abstract (in English):</b>
                    <p className="text-slate-700 mt-0.5">
                      This research develops multi-parametric intelligent evaluation models, cryptographic SHA-256 audit chaining, and biometric proctoring architectures for graduate student semester monitoring in higher education.
                    </p>
                  </div>
                </div>

                {/* 1-Bob va Matn parchasi */}
                <div>
                  <h4 className="font-sans font-bold text-xs text-slate-900 uppercase tracking-wide border-b pb-1 mb-2">
                    1-Bob. Oliy ta'limda monitoring va intellektual baholashning dolzarb holati tahlili
                  </h4>
                  <p className="text-justify indent-6">
                    Oliy ta’lim tizimida magistratura bosqichi talabalarining ilmiy-tadqiqot va pedagogik faoliyatini ob’ektiv, shaffof baholash ta’lim sifati kafolatining asosi hisoblanadi. O‘zbekiston Respublikasi Vazirlar Mahkamasining 2015-yil 2-martdagi 36-son qarori talablariga muvofiq, magistrantlarning semestrlik tadqiqot faoliyati qat’iy kalendar reja asosida monitoring qilinishi belgilangan.
                  </p>
                  <p className="text-justify indent-6 mt-2">
                    Tadqiqot doirasida ko'p mezonli tahlil, sun'iy intellektual modellashtirish va akademik halollikni ta'minlash mexanizmlari qiyosiy tahlil qilindi. Olingan natijalar OAK tasarrufidagi "Muhammed al-Xorazmiy avlodlari" jurnalida chop etilgan ilmiy model asosida eksperimental tasdiqlangan.
                  </p>
                </div>

                {/* Format tekshiruvi natijalari nishoni (VMQ 26-33) */}
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 font-sans">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Format va Struktura Tekshiruvi: 11/11 Talab Bajarildi
                    </span>
                    <span className="text-[10px] text-emerald-700 font-mono">Hajm: 76 bet • 1.5 interval</span>
                  </div>
                </div>
              </div>
            )}

            {viewerTab === 'slaydlar' && (
              <div className="space-y-4">
                <div className="bg-slate-900 text-white rounded-xl p-6 text-center space-y-2">
                  <span className="text-xs text-blue-400 uppercase tracking-widest font-sans font-bold">1-slayd / 6 (Titul)</span>
                  <h3 className="text-base font-bold font-sans">Oliy ta'lim jarayonlarida talabalar faoliyatini monitoring qilish va intellektual baholash tizimlarini ishlab chiqish</h3>
                  <p className="text-xs text-slate-300 font-sans">Magistrant: Bozorov Bobur | Ilmiy rahbar: Dotsent, t.f.n. A. Qodirov</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center font-sans">
                    <span className="text-[10px] text-blue-600 font-bold">2-slayd</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">Muammo va monitoring zaruriyati</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Subyektiv baholash va VMQ talablari</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center font-sans">
                    <span className="text-[10px] text-blue-600 font-bold">3-slayd</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">Taklif etilgan ko‘p parametrli model</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">7 ta komponentli muvozanatli rubrika</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center font-sans">
                    <span className="text-[10px] text-blue-600 font-bold">4-slayd</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">Proktoring va akademik halollik</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">AI indikatorlari va biometrik tekshiruv</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center font-sans">
                    <span className="text-[10px] text-blue-600 font-bold">5-slayd</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">Eksperiment natijalari va sinov</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Kafedra magistrantlari ko‘rsatkichlari tahlili</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs text-center font-sans col-span-2">
                    <span className="text-[10px] text-blue-600 font-bold">6-slayd</span>
                    <p className="text-xs font-bold text-slate-800 mt-1">Xulosa va amaliy tavsiyalar</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">OTM tizimlariga integratsiya va me'yoriy asoslar</p>
                  </div>
                </div>
              </div>
            )}

            {viewerTab === 'plagiat' && (
              <div className="space-y-4 font-sans">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Antiplagiat va O‘xshashlik Natijasi</h4>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      8.4% (Yashil toifa — Xavfsiz)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    Adabiyotlar ro‘yxati va to‘g‘ri keltirilgan iqtiboslar chiqarib tashlangan. Xavf chegarasi: 20% dan past.
                  </p>
                  
                  <div className="space-y-1.5 text-xs text-slate-700 pt-2 border-t">
                    <p className="font-semibold text-slate-800">Aniqlangan qisman manbalar:</p>
                    <p>• Muhammed al-Xorazmiy avlodlari, 2026, № 1(27) — 3.8%</p>
                    <p>• "Zamonaviy AKT va raqamli iqtisodiyot" anjumani to‘plami, Navoiy, 2026 — 2.9%</p>
                    <p>• Oliy ta’lim ilmiy axborotnomasi bazasi — 1.7%</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">Sun’iy Intellekt (AI) Indikatori</h4>
                    <span className="text-xs font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded">
                      11.2% ehtimollik
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    <b className="text-amber-800">8.3-band talabi:</b> Ushbu ko‘rsatkich bahoni avtomatik kamaytirmaydi. Tahririy yordamchi darajasida baholanadi. Ishchi guruh uchun jonli savol-javobda mualliflikni aniqlash uchun kontekst sifatida taqdim etilgan.
                  </p>
                </div>
              </div>
            )}

            {viewerTab === 'video' && (
              <div className="bg-slate-900 rounded-xl p-6 text-white text-center font-sans space-y-3">
                <Video className="w-12 h-12 text-blue-400 mx-auto" />
                <h4 className="text-sm font-bold">5 Daqiqalik Jonli Taqdimot Yozuvi</h4>
                <p className="text-xs text-slate-400">
                  O‘tkazilgan vaqt: 12-mart, 2026 (Davomiyligi: 4 daqiqa 55 soniya)
                </p>
                <div className="inline-block bg-emerald-900/60 border border-emerald-500 text-emerald-300 text-xs px-3 py-1 rounded-full font-semibold">
                  Liveness: 99.4% • Texnik uzilishlar: 0 ta
                </div>
              </div>
            )}

          </div>

          {/* Pastki panel: Hujjatni to'liq ekranda ochish va eksport */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono">SHA-256: 7f83b1657ff1fc53...9069</span>
            <button
              onClick={() => PdfExportService.exportEvidencePack(selectedStudentId)}
              className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer bg-transparent border-none p-0 text-xs transition"
              title="Talabaning rasmiy Dalillar to'plami PDF hujjatini yuklab olish"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Dalillar to‘plami (PDF)</span>
            </button>
          </div>

        </div>

        {/* ========================================================= */}
        {/* O'NG PANEL (6 / 12): 0-5 BALLIK TEZKOR RUBRIKA FORMASI     */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Rubrika komponentlari tablari */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveComponent('ilmiy_hisobot')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition truncate text-center ${
                activeComponent === 'ilmiy_hisobot'
                  ? 'bg-blue-900 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              1. Ilmiy hisobot (30%)
            </button>
            <button
              onClick={() => setActiveComponent('jonli_taqdimot')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition truncate text-center ${
                activeComponent === 'jonli_taqdimot'
                  ? 'bg-blue-900 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              2. Jonli taqdimot (20%)
            </button>
            <button
              onClick={() => setActiveComponent('pedagogik_hisobot')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition truncate text-center ${
                activeComponent === 'pedagogik_hisobot'
                  ? 'bg-blue-900 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              3. Pedagogik (15%)
            </button>
            <button
              onClick={() => setActiveComponent('taqdimot_slaydlari')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition truncate text-center ${
                activeComponent === 'taqdimot_slaydlari'
                  ? 'bg-blue-900 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              4. Slaydlar (10%)
            </button>
          </div>

          {/* Rubrika mezonlari va 0-5 ballik baholash kartasi */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Sarlavha va Ball hisobi */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Ilmiy Natijalar Hisoboti (VMQ 44-band & Annex A)
                </h3>
                <p className="text-[11px] text-slate-500">
                  0–5 ballik shkala. 2 dan past va 5 ball uchun asosli izoh majburiy.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Oraliq jami:</span>
                <span className="text-base font-black text-blue-900">
                  {calculateSubtotal().sum} / 50 b <span className="text-xs text-indigo-700 font-bold">({calculateSubtotal().weighted}%)</span>
                </span>
              </div>
            </div>

            {/* Mezonlar ro'yxati */}
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {criteriaList.map((crit) => {
                const currentScore = scores[crit.id] || 0;
                const needsComment = currentScore <= 2 || currentScore === 5;

                return (
                  <div key={crit.id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="max-w-md">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-400 font-mono">#{crit.num}</span>
                          <h4 className="text-xs font-bold text-slate-900">{crit.name}</h4>
                        </div>
                      </div>

                      {/* 0-5 Ball tugmalari */}
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        {[0, 1, 2, 3, 4, 5].map((pts) => (
                          <button
                            key={pts}
                            onClick={() => handleScoreChange(crit.id, pts)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                              currentScore === pts
                                ? 'bg-blue-900 text-white shadow'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {pts}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Izoh maydoni (Annex A bo'yicha) */}
                    <div>
                      <input
                        type="text"
                        value={comments[crit.id] || ''}
                        onChange={(e) => handleCommentChange(crit.id, e.target.value)}
                        placeholder={needsComment ? "* Majburiy asosli izoh (Annex A)..." : "Izoh (ixtiyoriy)..."}
                        className={`w-full text-[11px] rounded-lg px-2.5 py-1.5 border transition ${
                          needsComment && !comments[crit.id]
                            ? 'border-rose-400 bg-rose-50/40 text-rose-900 placeholder:text-rose-400 focus:ring-rose-500'
                            : 'border-slate-200 bg-white text-slate-800 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Suhbat va tavsiyalar (Nizom 51-band) */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
                  <span>Savol-javob qaydlari va tavsiyalar (VMQ 51-band):</span>
                </label>
                <textarea
                  value={panelRecs}
                  onChange={(e) => setPanelRecs(e.target.value)}
                  rows={2}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Saqlash tugmasi */}
              <button
                onClick={handleSubmitScores}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white text-xs font-bold py-3 px-4 rounded-xl shadow transition transform active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Baholashni Yakunlash va Topshirish</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
