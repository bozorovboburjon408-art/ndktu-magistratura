import React, { useState, useEffect } from 'react';
import { User, Appeal } from '../types';
import { UZ_LABELS } from '../locales/uz';
import { LocalDatabase } from '../services/localDatabase';
import { PdfExportService } from '../services/pdfExportService';
import { NotificationService } from '../services/notificationService';
import { Scale, Clock, CheckCircle, XCircle, FileText, Download, ShieldCheck } from 'lucide-react';

interface AppealCommissionViewProps {
  user: User;
}

export const AppealCommissionView: React.FC<AppealCommissionViewProps> = ({ user }) => {
  const [appeals, setAppeals] = useState<Appeal[]>(() => LocalDatabase.getAppeals());
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(() => LocalDatabase.getAppeals()[0] || null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [scoreAdjustment, setScoreAdjustment] = useState<number>(5.0);

  useEffect(() => {
    return LocalDatabase.subscribe(() => {
      const updated = LocalDatabase.getAppeals();
      setAppeals(updated);
      if (selectedAppeal) {
        setSelectedAppeal(updated.find(a => a.id === selectedAppeal.id) || updated[0] || null);
      } else {
        setSelectedAppeal(updated[0] || null);
      }
    });
  }, [selectedAppeal]);

  const handleResolve = async (status: 'accepted' | 'rejected') => {
    if (!selectedAppeal) return;
    if (!decisionNotes || decisionNotes.trim().length < 10) {
      NotificationService.warning(
        "Bayonnoma to'liq emas",
        "Apellatsiya komissiyasi xulosasi kamida 10 ta belgidan iborat bo'lishi majburiy!"
      );
      return;
    }

    await LocalDatabase.decideAppeal(
      selectedAppeal.id,
      status,
      status === 'accepted' ? scoreAdjustment : 0,
      decisionNotes,
      user.full_name
    );

    setDecisionNotes('');
    NotificationService.success(
      "Apellatsiya qarori qabul qilindi",
      status === 'accepted' ? "QANOATLANTIRILDI (Yangi baho v2 yaratildi)" : "RAD ETILDI"
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Sarlavha */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-rose-700" />
            <h2 className="text-lg font-bold text-slate-900">Apellatsiya Komissiyasi Paneli</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            VMQ № 36 45^1–45^5 bandlar bo‘yicha Rektor buyrug‘i bilan tashkil etilgan komissiya
          </p>
        </div>

        <div className="flex items-center gap-2 bg-rose-50 text-rose-800 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold">
          <Clock className="w-4 h-4 text-rose-600" />
          <span>Qat’iy 24 soatlik qaror reglamenti</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chap panel: Arizalar ro'yxati */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Kelib tushgan arizalar (72 soat ichida)
          </h3>

          <div className="space-y-2">
            {appeals.map(a => (
              <div
                key={a.id}
                onClick={() => setSelectedAppeal(a)}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  selectedAppeal?.id === a.id
                    ? 'border-rose-500 bg-rose-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{a.student_name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    a.status === 'topshirildi' ? 'bg-amber-100 text-amber-800' :
                    a.status === 'qanoatlantirildi' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {a.status === 'topshirildi' ? 'Ko‘rib chiqilmoqda' : a.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 truncate">{a.grounds}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-rose-600 font-bold">
                  <span>Qolgan vaqt: {a.remaining_hours} soat</span>
                  <span className="text-slate-400 font-normal">VMQ 45^3</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* O'ng panel: Tanlangan apellatsiya tafsilotlari va qaror qabul qilish */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          {selectedAppeal ? (
            <>
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedAppeal.student_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedAppeal.target_component || 'Magistratura monitoringi'}</p>
                </div>
                <button
                  onClick={() => PdfExportService.exportEvidencePack(selectedAppeal.student_id)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 border border-blue-200 px-3 py-1.5 rounded-lg bg-blue-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Dalillar To‘plamini Ko‘rish (PDF)</span>
                </button>
              </div>

              {/* Talaba e'tiroz asosi */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 mb-1">Talabaning yozma e’tirozi (grounds):</h4>
                <p className="text-xs text-slate-800 leading-relaxed italic">
                  "{selectedAppeal.grounds}"
                </p>
              </div>

              {/* Qaror shakli */}
              {selectedAppeal.status === 'topshirildi' ? (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Komissiya Qarorini Rasmiylashtirish
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Komissiya tarkibi:
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedAppeal.commission_members}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Agar qanoatlantirilsa, qo‘shiladigan ball miqdori (ball o‘zgarishi):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={scoreAdjustment}
                      onChange={(e) => setScoreAdjustment(parseFloat(e.target.value) || 0)}
                      className="w-48 text-xs border border-slate-300 rounded-lg p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Komissiya Qaror Bayonnomasi (Majburiy yozma xulosa):
                    </label>
                    <textarea
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      rows={4}
                      placeholder="Talabaning taqdim etgan dalillari va adabiyotlar tahlili komissiya tomonidan qayta ko‘rib chiqildi va quyidagi xulosaga kelindi..."
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleResolve('accepted')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-lg shadow"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Qanoatlantirish (+{scoreAdjustment} ball)</span>
                    </button>
                    <button
                      onClick={() => handleResolve('rejected')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-lg shadow"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rad Etish (O‘zgarishsiz qoldirish)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs">
                  <span className="font-bold text-emerald-900">Ushbu apellatsiya bo‘yicha qaror qabul qilingan:</span>
                  <p className="text-emerald-800 mt-1">{selectedAppeal.commission_decision_notes || "Qanoatlantirildi va yangi baho v2 ro'yxatga olindi."}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">Ariza tanlanmagan</p>
          )}
        </div>

      </div>

    </div>
  );
};
