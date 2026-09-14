import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Scale, ShieldCheck } from 'lucide-react';

interface AppealCountdownWidgetProps {
  publishedAtIso: string;
  onOpenAppealModal: () => void;
}

export const AppealCountdownWidget: React.FC<AppealCountdownWidgetProps> = ({
  publishedAtIso,
  onOpenAppealModal
}) => {
  const TOTAL_WINDOW_SECONDS = 72 * 3600; // 72 soat = 259,200 soniya

  // Qolgan vaqtni soniyalarda hisoblash
  const calculateRemainingSeconds = () => {
    const publishedTime = new Date(publishedAtIso).getTime();
    const deadlineTime = publishedTime + (72 * 3600 * 1000);
    const now = Date.now();
    const diff = Math.floor((deadlineTime - now) / 1000);
    return Math.max(0, diff);
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(calculateRemainingSeconds());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds(calculateRemainingSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [publishedAtIso]);

  // Soat, daqiqa, soniya formatlash
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const isExpired = remainingSeconds <= 0;
  const isUrgent = remainingSeconds < 12 * 3600; // 12 soatdan kam qolgan bo'lsa
  const progressRatio = remainingSeconds / TOTAL_WINDOW_SECONDS;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-white shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-2.5 mb-3">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>72 Soatlik Apellatsiya Darchasi</span>
          </span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono">
            VMQ 45^2-band
          </span>
        </div>

        <p className="text-[11px] text-blue-200 leading-snug">
          Baho e’lon qilingandan so‘ng 72 soat ichida talaba norozilik bildirishi mumkin:
        </p>

        {/* Real vaqt teskari hisoblovchi raqamlar */}
        <div className="my-4 flex items-center justify-center gap-2">
          {/* Soat */}
          <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center min-w-[60px] border border-white/10 shadow">
            <span className="text-2xl font-black font-mono tracking-tight text-white">
              {hours.toString().padStart(2, '0')}
            </span>
            <p className="text-[9px] text-blue-300 uppercase mt-0.5">Soat</p>
          </div>
          <span className="text-xl font-bold text-amber-400 font-mono">:</span>

          {/* Daqiqa */}
          <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center min-w-[60px] border border-white/10 shadow">
            <span className="text-2xl font-black font-mono tracking-tight text-white">
              {minutes.toString().padStart(2, '0')}
            </span>
            <p className="text-[9px] text-blue-300 uppercase mt-0.5">Daqiqa</p>
          </div>
          <span className="text-xl font-bold text-amber-400 font-mono">:</span>

          {/* Soniya */}
          <div className="bg-slate-900/60 rounded-xl px-3 py-2 text-center min-w-[60px] border border-white/10 shadow">
            <span className="text-2xl font-black font-mono tracking-tight text-amber-400">
              {seconds.toString().padStart(2, '0')}
            </span>
            <p className="text-[9px] text-blue-300 uppercase mt-0.5">Soniya</p>
          </div>
        </div>

        {/* Progress chizig'i */}
        <div className="w-full bg-slate-900/40 rounded-full h-1.5 overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isUrgent ? 'bg-rose-500' : 'bg-amber-400'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, progressRatio * 100))}%` }}
          ></div>
        </div>
      </div>

      <div>
        {isExpired ? (
          <div className="bg-slate-800/80 rounded-xl p-2.5 text-center text-xs text-rose-300 font-bold">
            Apellatsiya berish muddati (72 soat) yakunlangan
          </div>
        ) : (
          <button
            onClick={onOpenAppealModal}
            className="w-full inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition transform active:scale-95"
          >
            <Scale className="w-4 h-4" />
            <span>Apellatsiya Arizasi Berish</span>
          </button>
        )}
      </div>
    </div>
  );
};
