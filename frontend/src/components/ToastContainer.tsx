import React, { useEffect, useState } from 'react';
import { AppNotification, NotificationService } from '../services/notificationService';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    return NotificationService.subscribe((list) => {
      setItems(list);
    });
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {items.map((item) => {
        const isSuccess = item.type === 'success';
        const isWarning = item.type === 'warning';
        const isError = item.type === 'error';
        const isInfo = item.type === 'info';

        return (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in slide-in-from-top-3 ${
              isSuccess
                ? 'bg-emerald-900/95 text-white border-emerald-500/50 shadow-emerald-950/20'
                : isWarning
                ? 'bg-amber-900/95 text-white border-amber-500/50 shadow-amber-950/20'
                : isError
                ? 'bg-rose-900/95 text-white border-rose-500/50 shadow-rose-950/20'
                : 'bg-slate-900/95 text-white border-blue-500/50 shadow-slate-950/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                {isError && <XCircle className="w-5 h-5 text-rose-400" />}
                {isInfo && <Info className="w-5 h-5 text-blue-400" />}
              </div>

              <div className="flex-1 pr-1">
                <h4 className="text-xs font-bold leading-snug">{item.title}</h4>
                <p className="text-[11px] text-slate-200 mt-0.5 leading-relaxed font-normal">
                  {item.message}
                </p>
              </div>

              <button
                onClick={() => NotificationService.dismiss(item.id)}
                className="text-slate-400 hover:text-white transition p-1 -mr-1 -mt-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
