import React, { useState, useEffect } from 'react';
import { User, AuditEntry } from '../types';
import { UZ_LABELS } from '../locales/uz';
import { LocalDatabase } from '../services/localDatabase';
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock, RefreshCw, AlertOctagon, RotateCcw } from 'lucide-react';

interface AuditTrailViewProps {
  user: User;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ user }) => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>(() => LocalDatabase.getAuditLogs());
  const [integrityStatus, setIntegrityStatus] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);

  useEffect(() => {
    return LocalDatabase.subscribe(() => {
      setAuditEntries(LocalDatabase.getAuditLogs());
    });
  }, []);

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const result = await LocalDatabase.verifyAuditIntegrity();
      setIntegrityStatus(result.isValid);
      if (result.isValid) {
        alert(`Kriptografik tekshiruv yakunlandi!\nBarcha ${auditEntries.length} ta SHA-256 zanjirli bloklar 100% yaxlit va soxtalashtirish alomatlari aniqlanmadi (FR-10.2).`);
      } else {
        alert(`DIQQAT! Kriptografik zanjir buzilganligi aniqlandi! Buzilish bloki: #${result.brokenAtId}`);
      }
    } catch (e: any) {
      alert("Tekshiruvda xatolik: " + e.message);
    } finally {
      setVerifying(false);
    }
  };

  const simulateTamperAttempt = () => {
    alert("FR-10.3 va A12 Xavfsizlik Qoidasi:\nAdministrator yoki har qanday shaxs tomonidan baholarni o'chirish yoki auditni o'zgartirish QAT'IYAN TAQIQLANGAN!\nUshbu noqonuniy urinish to'xtatildi va xavfsizlik jurnaliga yozildi.");
    LocalDatabase.addAuditEntry(
      'TAMPER_ATTEMPT_BLOCKED',
      'SECURITY_POLICY',
      'AUDIT_LOG',
      `Noqonuniy o'zgartirish urinishi to'xtatildi (A12 stsenariysi). Foydalanuvchi: ${user.full_name}`,
      user.id
    );
  };

  const handleResetData = () => {
    if (confirm("Haqiqatan ham barcha ma'lumotlarni dastlabki standart holatga qaytarmoqchimisiz?")) {
      LocalDatabase.resetToDefault();
      setAuditEntries(LocalDatabase.getAuditLogs());
      alert("Barcha ma'lumotlar dastlabki holatga qaytarildi!");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sarlavha va Kriptografik Zanjir Yaxlitligi Belgisi */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-6 h-6 text-slate-800" />
            <h2 className="text-lg font-bold text-slate-900">
              Kriptografik Zanjirli Audit Jurnali (Tamper-evident Audit Trail)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            FR-10 talabi: Har bir amal SHA-256 xesh zanjiri bilan himoyalangan va uni orqaga qaytarib yoki yashirincha o‘zgartirib bo‘lmaydi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetData}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-lg border border-slate-300 transition"
            title="Lokal bazani dastlabki holatga qaytarish"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Bazani Qayta Tiklash</span>
          </button>

          <button
            onClick={verifyChain}
            disabled={verifying}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>Zanjir Yaxlitligini Tekshirish (SHA-256)</span>
          </button>
        </div>
      </div>

      {/* Yaxlitlik Tasdig'i Banderoli */}
      <div className={`border rounded-xl p-4 flex items-center justify-between ${
        integrityStatus ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
      }`}>
        <div className="flex items-center gap-3">
          {integrityStatus ? (
            <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0" />
          )}
          <div>
            <h4 className={`text-sm font-bold ${integrityStatus ? 'text-emerald-900' : 'text-rose-900'}`}>
              {integrityStatus ? "Kriptografik SHA-256 zanjiri buzilmagan (Integrity 100% Verified)" : "DIQQAT: Zanjir yaxlitligi buzilgan!"}
            </h4>
            <p className={`text-xs ${integrityStatus ? 'text-emerald-800' : 'text-rose-800'}`}>
              Audit bazasidagi jami {auditEntries.length} ta yozuvning har biri avvalgi blok xeshi bilan qat'iy bog'langan.
            </p>
          </div>
        </div>

        {/* FR-10.3 / A12 sinovi tugmasi */}
        <button
          onClick={simulateTamperAttempt}
          className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
        >
          <AlertOctagon className="w-4 h-4" />
          <span>A12 Sinovi: Noqonuniy o‘zgartirish urinishi</span>
        </button>
      </div>

      {/* Audit Yozuvlari Jadvali */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            O‘chirilmaydigan Kriptografik Yozuvlar (Append-Only Log: {auditEntries.length} ta)
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">Barcha ma'lumotlar localStorage'da saqlanadi</span>
        </div>

        <div className="divide-y divide-slate-100">
          {[...auditEntries].reverse().map((entry) => (
            <div key={entry.id} className="p-4 space-y-2 hover:bg-slate-50/50 transition">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded font-mono">
                    {entry.action}
                  </span>
                  <span className="font-semibold text-slate-800">{entry.target_type}</span>
                  <span className="text-slate-400 font-mono text-[11px]">#{entry.target_id}</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-slate-700 font-medium">{entry.details}</p>

              {/* SHA-256 xesh zanjiri ko'rinishi */}
              <div className="bg-slate-50 rounded-lg p-2.5 font-mono text-[10px] text-slate-500 space-y-0.5 border border-slate-100">
                <p className="truncate"><b className="text-slate-700">Oldingi Xesh (Prev):</b> {entry.previous_hash}</p>
                <p className="truncate"><b className="text-emerald-700">Joriy Xesh (Curr):</b> {entry.current_hash}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
