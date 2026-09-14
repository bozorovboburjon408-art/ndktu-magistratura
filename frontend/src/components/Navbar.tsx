import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { UZ_LABELS } from '../locales/uz';
import { 
  ShieldCheck, GraduationCap, UserCheck, BookOpen, Scale, Award, 
  Smartphone, X 
} from 'lucide-react';
import { NotificationService } from '../services/notificationService';

interface NavbarProps {
  currentUser: User;
  onRoleChange: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onRoleChange,
  activeTab,
  setActiveTab
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showPwaModal, setShowPwaModal] = useState<boolean>(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      NotificationService.success("Ilova o'rnatildi", "NDKTU Magistratura tizimi qurilmangizga muvaffaqiyatli o'rnatildi.");
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowPwaModal(true);
    }
  };

  const roleIcons: Record<UserRole, React.ReactNode> = {
    talaba: <GraduationCap className="w-4 h-4 text-emerald-600" />,
    ilmiy_rahbar: <BookOpen className="w-4 h-4 text-blue-600" />,
    baholovchi: <UserCheck className="w-4 h-4 text-amber-600" />,
    kafedra_mudiri: <Award className="w-4 h-4 text-purple-600" />,
    apellatsiya: <Scale className="w-4 h-4 text-rose-600" />,
    administrator: <ShieldCheck className="w-4 h-4 text-slate-700" />,
    auditor: <ShieldCheck className="w-4 h-4 text-cyan-600" />
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* NDKTU Logo va Platforma Sarlavhasi */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('portal')}>
            <div className="w-11 h-11 rounded-xl bg-white p-0.5 border border-blue-200 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="NDKTU" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60">
                  NDKTU
                </span>
                <span className="text-[11px] font-semibold text-slate-500 hidden md:inline truncate max-w-[340px]">
                  Navoiy davlat konchilik va texnologiyalar universiteti
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                Magistratura Monitoring va Baholash Platformasi
              </h1>
            </div>
          </div>

          {/* O'ng taraf: PWA o'rnatish, Rol almashtirgich va Audit */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* PWA Ilovani o'rnatish tugmasi */}
            {!isInstalled && (
              <button
                onClick={handleInstallClick}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition shadow-xs"
                title="Ilovani telefon yoki kompyuterga o'rnatish (PWA)"
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ilovani o‘rnatish</span>
              </button>
            )}

            {/* Rol almashtirgich */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
              <span className="text-xs font-semibold text-slate-600 px-1.5 hidden sm:flex items-center gap-1">
                {roleIcons[currentUser.role]}
                Rol:
              </span>
              <select
                value={currentUser.role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="text-xs font-medium bg-white text-slate-800 rounded px-2.5 py-1.5 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="talaba">Talaba (Bozorov Bobur)</option>
                <option value="ilmiy_rahbar">Ilmiy rahbar (Dots. A.Qodirov)</option>
                <option value="baholovchi">Baholovchi (Dots. J.Nurmatov)</option>
                <option value="kafedra_mudiri">Kafedra mudiri (Prof. O.Rustamov)</option>
                <option value="apellatsiya">Apellatsiya komissiyasi (Prof. Sh.Aliyev)</option>
                <option value="administrator">Administrator (Tizim audit)</option>
              </select>
            </div>

            {/* Audit tekshirish yorlig'i */}
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                activeTab === 'audit'
                  ? 'bg-blue-900 text-white border-blue-900'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zanjirli Audit</span>
            </button>
          </div>

        </div>
      </div>

      {/* PWA O'rnatish Qo'llanma Modali */}
      {showPwaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 p-1 border border-blue-200 flex items-center justify-center">
                  <img src="/logo.png" alt="NDKTU" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">NDKTU Ilovasini O‘rnatish (PWA)</h3>
                  <p className="text-[11px] text-slate-500">Mustaqil mobil va desktop ilova</p>
                </div>
              </div>
              <button onClick={() => setShowPwaModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <b className="text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Android yoki Windows / Mac (Chrome, Edge):
                </b>
                <p className="text-slate-600 text-[11px]">
                  Brauzer manzil qatoridagi <b>"O‘rnatish" (Install)</b> belgisini yoki menyudagi <i>"Ilovani o‘rnatish"</i> tugmasini bosing.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <b className="text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  iPhone / iPad (Safari):
                </b>
                <p className="text-slate-600 text-[11px]">
                  Pastdagi <b>"Ulashish" (Share)</b> tugmasini bosing va <b>"Bosh ekranga qo‘shish" (Add to Home Screen)</b> bandini tanlang.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPwaModal(false)}
                className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Tushundim
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
