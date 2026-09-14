import React, { useState } from 'react';
import { 
  FileUp, Cpu, UserCheck, Video, Award, Scale, 
  CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';

export interface TimelineStep {
  id: number;
  title: string;
  subTitle: string;
  status: 'completed' | 'current' | 'upcoming';
  date: string;
  details: string[];
  icon: any;
}

export const MonitoringTimeline: React.FC = () => {
  const [expandedStep, setExpandedStep] = useState<number | null>(6);

  const steps: TimelineStep[] = [
    {
      id: 1,
      title: "Hujjat Topshirish",
      subTitle: "3 ta majburiy artefakt yuklandi",
      status: "completed",
      date: "10-mart, 2026",
      details: [
        "Taqdimot slaydlari (.pptx) — SHA-256 xeshi tasdiqlangan",
        "Ilmiy natijalar hisoboti (.pdf) — v1 muzlatilgan",
        "Pedagogik amaliyot hisoboti (.pdf) — 100% yuklangan"
      ],
      icon: FileUp
    },
    {
      id: 2,
      title: "Dastlabki Tekshiruv",
      subTitle: "Nizom 26-33 & Plagiat/AI",
      status: "completed",
      date: "10-mart, 2026",
      details: [
        "Format compliance: 11/11 mezon to'liq mos",
        "Antiplagiat: 8.4% (Yashil toifa — ruxsat berilgan)",
        "AI indikatori: 11.2% (Tahririy yordamchi darajasida)"
      ],
      icon: Cpu
    },
    {
      id: 3,
      title: "Ilmiy Rahbar Xulosasi",
      subTitle: "Kalendar reja tasdig'i",
      status: "completed",
      date: "11-mart, 2026",
      details: [
        "Kalendar ish reja bandlari 100% tasdiqlandi",
        "Ilmiy rahbar: Dotsent, t.f.n. A. Qodirov ijobiy xulosa berdi"
      ],
      icon: UserCheck
    },
    {
      id: 4,
      title: "Jonli 5 Daqiqalik Taqdimot",
      subTitle: "Suhbat va savol-javob (Nizom 51)",
      status: "completed",
      date: "12-mart, 2026",
      details: [
        "5 daqiqalik slayd namoyishi to'liq o'tkazildi",
        "Liveness va uzluksiz yuz tekshiruvi: 99.4% muvaffaqiyatli",
        "Ishchi guruhning spontan savollariga mustaqil javob berildi"
      ],
      icon: Video
    },
    {
      id: 5,
      title: "Ishchi Guruh Baholashi",
      subTitle: "Xolis (ko'r) rubrika",
      status: "completed",
      date: "12-mart, 2026",
      details: [
        "Baholovchilar (Dots. J.Nurmatov va Dots. N.Qosimova) ballari kiritildi",
        "20 balldan ortiq og'ish aniqlanmadi (Kelishilgan)",
        "Dastlabki yakuniy ko'rsatkich hisoblandi"
      ],
      icon: Award
    },
    {
      id: 6,
      title: "Tasdiqlash & Apellatsiya",
      subTitle: "72 soatlik darcha ochiq",
      status: "current",
      date: "12–15-mart, 2026",
      details: [
        "Kafedra mudiri bahoni rasman tasdiqladi va e'lon qildi",
        "Talabaga 72 soatlik apellatsiya huquqi berildi (VMQ 45^2-band)",
        "Reyting o'rni: 1-o'rin / 24 talaba (97.66 ball — A'lo 5)"
      ],
      icon: Scale
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Talaba Monitoring Yo‘li (Semester Progress Stepper)</span>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              6-bosqich: Apellatsiya darchasi
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            O‘zbekiston Respublikasi VMQ № 36 qoidalari bo‘yicha talabaning semestr davomidagi to‘liq traektoriyasi
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Jarayon: <b className="text-emerald-700">100% yakunlangan</b>
        </span>
      </div>

      {/* Gorizontal Progress Bar (Katta ekranlar uchun) */}
      <div className="hidden lg:grid grid-cols-6 gap-2 relative mb-6">
        {/* Orqa chiziq */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-slate-200 -z-0">
          <div className="h-full bg-emerald-500 w-full transition-all duration-700"></div>
        </div>

        {steps.map((step) => {
          const Icon = step.icon;
          const isSelected = expandedStep === step.id;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <div 
              key={step.id} 
              onClick={() => setExpandedStep(isSelected ? null : step.id)}
              className="relative z-10 flex flex-col items-center cursor-pointer group"
            >
              {/* Doira ikonkasi */}
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isCurrent 
                  ? 'bg-gradient-to-br from-indigo-700 to-blue-900 text-white shadow-lg ring-4 ring-indigo-100 scale-105' 
                  : isCompleted 
                    ? 'bg-emerald-600 text-white shadow' 
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>

              {/* Matn */}
              <div className="text-center mt-2.5">
                <p className="text-[11px] font-bold text-slate-900 leading-tight group-hover:text-indigo-700 transition">
                  {step.title}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{step.date}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kichik ekranlar (Mobil / Planshet) uchun vertikal ro'yxat */}
      <div className="lg:hidden space-y-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const isSelected = expandedStep === step.id;
          const isCurrent = step.status === 'current';
          const isCompleted = step.status === 'completed';

          return (
            <div 
              key={step.id} 
              onClick={() => setExpandedStep(isSelected ? null : step.id)}
              className={`p-3.5 rounded-xl border transition cursor-pointer ${
                isSelected 
                  ? 'border-indigo-400 bg-indigo-50/40' 
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isCurrent ? 'bg-indigo-700 text-white' : isCompleted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{step.title}</h4>
                    <p className="text-[10px] text-slate-500">{step.subTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{step.date}</span>
                  {isSelected ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tanlangan bosqich bo'yicha kengaytirilgan batafsil ma'lumot */}
      {expandedStep && (
        <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-200/80 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              {steps.find(s => s.id === expandedStep)?.title} — Batafsil Bayonnoma
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">
              Sana: {steps.find(s => s.id === expandedStep)?.date}
            </span>
          </div>

          <ul className="space-y-1.5 text-xs text-slate-700">
            {steps.find(s => s.id === expandedStep)?.details.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};
