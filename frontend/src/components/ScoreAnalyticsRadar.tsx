import React from 'react';
import { FinalMark } from '../types';

interface ScoreAnalyticsRadarProps {
  mark: FinalMark;
}

export const ScoreAnalyticsRadar: React.FC<ScoreAnalyticsRadarProps> = ({ mark }) => {
  // 7 ta komponent bo'yicha ma'lumotlar va foizlar
  const components = [
    { label: "Ilmiy hisobot", weight: "30%", score: mark.research_report_score, max: 30, pct: (mark.research_report_score / 30) },
    { label: "Jonli taqdimot", weight: "20%", score: mark.live_presentation_score, max: 20, pct: (mark.live_presentation_score / 20) },
    { label: "Pedagogik", weight: "15%", score: mark.pedagogical_report_score, max: 15, pct: (mark.pedagogical_report_score / 15) },
    { label: "Slaydlar", weight: "10%", score: mark.slides_score, max: 10, pct: (mark.slides_score / 10) },
    { label: "Nashrlar", weight: "10%", score: mark.publications_score, max: 10, pct: (mark.publications_score / 10) },
    { label: "Reja/Seminar", weight: "10%", score: mark.calendar_plan_score, max: 10, pct: (mark.calendar_plan_score / 10) },
    { label: "HEMIS GPA", weight: "5%", score: mark.academic_performance_score, max: 5, pct: (mark.academic_performance_score / 5) }
  ];

  // SVG Radar diagrammasi parametrlari
  const size = 320;
  const center = size / 2;
  const radius = 105;
  const totalAxes = components.length;

  // Har bir o'qning koordinatalari
  const getCoordinates = (index: number, valueRatio: number) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const x = center + radius * valueRatio * Math.cos(angle);
    const y = center + radius * valueRatio * Math.sin(angle);
    return { x, y };
  };

  // Radar to'ri (concentric levels: 20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // Talaba natijalari bo'yicha ko'pburchak nuqtalari
  const dataPolygonPoints = components.map((c, i) => {
    const { x, y } = getCoordinates(i, Math.min(1.0, Math.max(0.1, c.pct)));
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            7 Ta Komponent Bo‘yicha Vizual Tahlil va Radar Diagrammasi
          </h3>
          <p className="text-xs text-slate-500">
            100 ballik taqsimotning har bir mezon bo‘yicha proporsional muvozanati
          </p>
        </div>
        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
          Umumiy: {mark.total_score} ball ({mark.grade_label})
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Chap qism: SVG Radar Diagrammasi */}
        <div className="lg:col-span-6 flex justify-center items-center">
          <div className="relative w-full max-w-[320px] aspect-square">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
              {/* Konsentrik doiralar / ko'pburchaklar to'ri */}
              {levels.map((lvl, lvlIdx) => {
                const points = components.map((_, i) => {
                  const { x, y } = getCoordinates(i, lvl);
                  return `${x},${y}`;
                }).join(' ');
                return (
                  <polygon
                    key={lvlIdx}
                    points={points}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth={lvlIdx === levels.length - 1 ? "1.5" : "1"}
                    strokeDasharray={lvlIdx < levels.length - 1 ? "3 3" : undefined}
                  />
                );
              })}

              {/* Markazdan tarqaluvchi o'q chiziqlari */}
              {components.map((_, i) => {
                const { x, y } = getCoordinates(i, 1.0);
                return (
                  <line
                    key={i}
                    x1={center}
                    y1={center}
                    x2={x}
                    y2={y}
                    stroke="#CBD5E1"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Natija poligon shakli (Gradient bilan to'ldirilgan) */}
              <defs>
                <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4338CA" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.25" />
                </linearGradient>
              </defs>
              <polygon
                points={dataPolygonPoints}
                fill="url(#radarGradient)"
                stroke="#4338CA"
                strokeWidth="2.5"
                className="transition-all duration-700 ease-out"
              />

              {/* O'q uchidagi ko'rsatkich nuqtalari */}
              {components.map((c, i) => {
                const { x, y } = getCoordinates(i, Math.min(1.0, Math.max(0.1, c.pct)));
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill="#1E1B4B"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all"
                  />
                );
              })}

              {/* Komponent matnli yorliqlari */}
              {components.map((c, i) => {
                const { x, y } = getCoordinates(i, 1.22);
                const isLeft = x < center - 10;
                const isRight = x > center + 10;
                return (
                  <text
                    key={i}
                    x={x}
                    y={y}
                    textAnchor={isLeft ? "end" : isRight ? "start" : "middle"}
                    dominantBaseline="central"
                    className="text-[10px] font-bold fill-slate-700 select-none"
                  >
                    {c.label} ({c.weight})
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* O'ng qism: 7 ta komponent progress-barlari */}
        <div className="lg:col-span-6 space-y-3">
          {components.map((c, idx) => {
            const percentage = Math.round(c.pct * 100);
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    {c.label} <span className="text-slate-400 font-normal">({c.weight})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-900 font-bold">
                      {c.score} / {c.max} b
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      percentage >= 85 ? 'bg-emerald-100 text-emerald-800' :
                      percentage >= 70 ? 'bg-blue-100 text-blue-800' :
                      percentage >= 60 ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      percentage >= 85 ? 'bg-emerald-600' :
                      percentage >= 70 ? 'bg-indigo-600' :
                      percentage >= 60 ? 'bg-amber-500' :
                      'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
