import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { LocalDatabase } from '../services/localDatabase';
import { CryptoService } from '../services/cryptoService';
import { NotificationService } from '../services/notificationService';
import { 
  Camera, Mic, Play, Pause, RotateCcw, AlertTriangle, 
  CheckCircle2, Wifi, WifiOff, Users, ArrowLeft, ShieldCheck,
  Video, VideoOff, Download, Circle
} from 'lucide-react';

interface LivePresentationRoomProps {
  user: User;
  onBack: () => void;
}

export const LivePresentationRoom: React.FC<LivePresentationRoomProps> = ({ user, onBack }) => {
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 daqiqa (300 soniya)
  const [isRunning, setIsRunning] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const totalSlides = 6;

  // Haqiqiy Veb-kamera va MediaRecorder (Web API)
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedVideoSize, setRecordedVideoSize] = useState<number>(0);

  // Liveness & Shaxsni tasdiqlash holati (FR-3.4, FR-3.5)
  const [livenessStatus, setLivenessStatus] = useState<'match' | 'multiple_faces' | 'fail'>('match');
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'dropped'>('online');
  const [eventLogs, setEventLogs] = useState<string[]>([
    "Sessiya boshlandi. Taqdimot xonasi tayyor.",
    "Boshlang'ich shaxsni tasdiqlash: Mos keldi (Ishonch: 99.4%)",
    "Taqdimot slayd yuklandi: Bozorov_Bobur_5_Daqiqalik_Taqdimot.pptx"
  ]);

  // Kamerani ishga tushirish (MediaDevices API)
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 } },
          audio: true
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        addLog("Haqiqiy veb-kamera va mikrofon faollashtirildi (MediaDevices API)");
      } else {
        throw new Error("Brauzeringiz MediaDevices API'ni qo'llab-quvvatlamaydi");
      }
    } catch (err: any) {
      console.warn("Kamera ochilmadi:", err);
      setCameraError("Veb-kamera ulanmadi yoki ruxsat berilmadi. Simulyatsiya rejimi faol.");
      setCameraActive(false);
      addLog("Kamera ulanmadi: Simulyatsiya rejimi ishga tushirildi");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    addLog("Veb-kamera to'xtatildi.");
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // MediaRecorder orqali videoni brauzerda yozib olish
  const startRecording = () => {
    recordedChunksRef.current = [];
    setRecordedVideoUrl(null);

    if (streamRef.current && cameraActive) {
      try {
        const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
          setRecordedVideoSize(blob.size);
          addLog(`Taqdimot videoyozuvi saqlandi (${CryptoService.formatBytes(blob.size)})`);
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setIsRunning(true);
        addLog("Taqdimot videoyozuvi (MediaRecorder) boshlandi");
        NotificationService.info("Videoyozuv boshlandi", "MediaRecorder taqdimot jarayonini yozib olmoqda");
      } catch (e: any) {
        NotificationService.error("Yozib olishda xatolik", e.message);
      }
    } else {
      // Simulyatsiya qilingan yozuv
      setIsRecording(true);
      setIsRunning(true);
      addLog("Simulyatsiya qilingan taqdimot videoyozuvi boshlandi");
      NotificationService.info("Taqdimot taymeri boshlandi", "5 daqiqalik hisob faol");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsRunning(false);
    addLog("Taqdimot videoyozuvi yakunlandi");
    NotificationService.success("Videoyozuv yakunlandi", "Taqdimot muvaffaqiyatli saqlandi va yuklab olish mumkin");
  };

  // Taymer hisobi
  useEffect(() => {
    let timer: any = null;
    if (isRunning && secondsLeft > 0 && connectionStatus === 'online') {
      timer = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            if (isRecording) stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, secondsLeft, connectionStatus, isRecording]);

  const addLog = (msg: string) => {
    const now = new Date().toLocaleTimeString();
    setEventLogs(prev => [`[${now}] ${msg}`, ...prev]);
  };

  // Daqiqa va soniyani formatlash
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const simulateFaceCheck = (type: 'match' | 'multiple_faces' | 'fail') => {
    setLivenessStatus(type);
    if (type === 'match') {
      addLog("Uzluksiz yuz tekshiruvi: Shaxs mos keldi (FR-3.4)");
    } else if (type === 'multiple_faces') {
      addLog("DIQQAT: Kadrda ikkinchi shaxs aniqlandi! Flag auditga yozildi (A2)");
      LocalDatabase.addAuditEntry(
        'FACE_VERIFICATION_FLAG',
        'PROCTORING',
        'SESS-2026-01',
        "Kadrda ikkinchi shaxs aniqlandi (A2 stsenariysi). Baholash to'xtatilmaydi, dalil yozildi.",
        user.id
      );
    } else {
      addLog("OGOHLANTIRISH: Yuz mos kelmadi! Flag tekshiruv navbatiga yozildi (A2)");
      LocalDatabase.addAuditEntry(
        'FACE_MISMATCH_FLAG',
        'PROCTORING',
        'SESS-2026-01',
        "Jonli efirda shaxs mos kelmadi (A2). Dalillar to'plamiga kiritildi.",
        user.id
      );
    }
  };

  const simulateConnectionDrop = () => {
    if (connectionStatus === 'online') {
      setConnectionStatus('dropped');
      addLog("Aloqa uzildi (Texnik hodisa). FR-3.8 bo'yicha jazo qo'llanmaydi (A4).");
      LocalDatabase.addAuditEntry(
        'CONNECTION_DROPPED_EVENT',
        'PROCTORING',
        'SESS-2026-01',
        "Internet aloqasi uzildi. Texnik hodisa sifatida qayd etildi (jazo yo'q).",
        user.id
      );
    } else {
      setConnectionStatus('online');
      addLog("Aloqa qayta tiklandi. Taqdimot davom ettirilmoqda (A4).");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Yuqori navigatsiya */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Talaba kabinetiga qaytish</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Monitoring Sessiyasi: #SESS-2026-01</span>
          <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Jonli efir (WebRTC/MediaDevices)
          </span>
        </div>
      </div>

      {/* Asosiy Video va Slayd Ko'rsatuv Maydoni */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chap 2 ustun: Taqdimot slaydlari (FR-3.2) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between shadow-xl min-h-[480px]">
          
          {/* Slayd Sarlavhasi */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs text-blue-400 font-bold">FR-3.2: Ekranga faqat yuklangan slayd uzatiladi</span>
              <h3 className="text-sm font-bold text-slate-200">
                Oliy ta'lim jarayonlarida talabalar faoliyatini monitoring qilish va intellektual baholash tizimlarini ishlab chiqish
              </h3>
            </div>
            <span className="text-xs bg-slate-800 px-2.5 py-1 rounded font-mono text-slate-300">
              Slayd {currentSlide} / {totalSlides}
            </span>
          </div>

          {/* Slayd Mazmuni */}
          <div className="my-8 bg-slate-800/80 rounded-xl p-6 border border-slate-700/60 shadow-inner flex flex-col justify-center items-center text-center min-h-[220px]">
            {currentSlide === 1 && (
              <div className="space-y-3">
                <span className="text-xs text-blue-400 uppercase tracking-widest font-semibold">1-slayd: Titul</span>
                <h2 className="text-lg font-black text-white max-w-xl">
                  Oliy ta'lim jarayonlarida talabalar faoliyatini monitoring qilish va intellektual baholash tizimlarini ishlab chiqish
                </h2>
                <p className="text-sm text-slate-300">
                  Magistrant: <b className="text-white">Bozorov Bobur Qudrat o‘g‘li</b> | Ilmiy rahbar: <b className="text-white">Dotsent, t.f.n. A. Qodirov</b>
                </p>
                <p className="text-xs text-slate-400">70610101 – Kompyuter tizimlari va dasturiy injiniring • Toshkent — 2026</p>
              </div>
            )}
            {currentSlide === 2 && (
              <div className="space-y-3 max-w-lg">
                <span className="text-xs text-blue-400 uppercase tracking-widest font-semibold">2-slayd: Muammo va zaruriyat</span>
                <h3 className="text-base font-bold text-white">Muammo va Tadqiqotning Dolzarbligi</h3>
                <div className="text-xs text-slate-300 text-left space-y-2 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                  <p>• Oliy ta’limda magistrantlar faoliyatini monitoring qilishdagi subyektiv omillar va axborot bo‘shliqlari.</p>
                  <p>• VMQ talablariga mos semestrlik 100 ballik shaffof va avtomatlashtirilgan baholash modelining yetishmasligi.</p>
                  <p>• Maqsad: Ko‘p parametrli intellektual monitoring va kriptografik dalillangan baholash tizimini yaratish.</p>
                </div>
              </div>
            )}
            {currentSlide === 3 && (
              <div className="space-y-3 max-w-lg">
                <span className="text-xs text-blue-400 uppercase tracking-widest font-semibold">3-slayd: Taklif etilgan model</span>
                <h3 className="text-base font-bold text-white">7 ta Komponentli Ko‘p Parametrli Baholash Mezoni</h3>
                <div className="grid grid-cols-2 gap-2 text-left text-xs text-slate-300">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700">1. Ilmiy hisobot (30%)</div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700">2. Jonli taqdimot (20%)</div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700">3. Pedagogik amaliyot (15%)</div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700">4. Taqdimot slaydlari (10%)</div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700">5. Ilmiy nashrlar (10%)</div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-700">6. Kalendar reja ijrosi (10%)</div>
                </div>
                <p className="text-[11px] text-emerald-400 font-medium">+ 7. HEMIS GPA o‘zlashtirish ko‘rsatkichi (5%) = Jami 100 ballik shkala</p>
              </div>
            )}
            {currentSlide === 4 && (
              <div className="space-y-3 max-w-lg">
                <span className="text-xs text-blue-400 uppercase tracking-widest font-semibold">4-slayd: Proktoring va halollik</span>
                <h3 className="text-base font-bold text-white">Akademik Halollik va Kriptografik Xavfsizlik</h3>
                <div className="text-xs text-slate-300 text-left space-y-2 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                  <p>• <b>Web Crypto API (SHA-256):</b> Har bir yuklangan hujjat uchun o‘zgarmas kriptografik xesh va audit zanjiri.</p>
                  <p>• <b>Biometrik Proktoring:</b> 99.4% liveness ishonchliligi, yuzni tekshirish va texnik hodisalarni ro‘yxatga olish.</p>
                  <p>• <b>Antiplagiat filtrlari:</b> Sun'iy intellekt (11.2%) va iqtibos o‘xshashligi (8.4%) ni adolatli saralash.</p>
                </div>
              </div>
            )}
            {currentSlide === 5 && (
              <div className="space-y-3 max-w-lg">
                <span className="text-xs text-blue-400 uppercase tracking-widest font-semibold">5-slayd: Eksperiment natijalari</span>
                <h3 className="text-base font-bold text-white">Sinov Natijalari va Tizim Samaradorligi</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700 text-center">
                    <p className="text-xl font-black text-emerald-400">97.66 ball</p>
                    <p className="text-[10px] text-slate-400 mt-1">Bozorov Bobur yakuniy bahosi (A'lo, 5)</p>
                  </div>
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700 text-center">
                    <p className="text-xl font-black text-blue-400">1 / 24</p>
                    <p className="text-[10px] text-slate-400 mt-1">Kafedra magistrantlari orasida 1-o‘rin</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">2 ta rasmiy nashr: "Muhammed al-Xorazmiy avlodlari" jurnali va xalqaro anjuman.</p>
              </div>
            )}
            {currentSlide === 6 && (
              <div className="space-y-3 max-w-lg">
                <span className="text-xs text-blue-400 uppercase tracking-widest font-semibold">6-slayd: Xulosa va tavsiyalar</span>
                <h3 className="text-base font-bold text-white">Xulosa va Amaliyotga Joriy Qilish</h3>
                <div className="text-xs text-slate-300 text-left space-y-2 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
                  <p>• Ishlab chiqilgan model VMQ 44, 26-33 va 51-bandlar talablariga to‘liq javob beradi.</p>
                  <p>• Oliy ta'lim muassasalari magistratura tizimiga avtomatlashtirilgan monitoring moduli sifatida joriy etish tavsiya etildi.</p>
                  <p>• E'tiboringiz uchun rahmat! Savol-javoblarga tayyorman.</p>
                </div>
              </div>
            )}
          </div>

          {/* Slayd navigatsiyasi */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <button
              onClick={() => setCurrentSlide(prev => Math.max(1, prev - 1))}
              disabled={currentSlide === 1}
              className="text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded"
            >
              ◀ Oldingi slayd
            </button>
            <span className="text-xs text-slate-400">Yuklangan fayl: Bozorov_Bobur_5_Daqiqalik_Taqdimot.pptx</span>
            <button
              onClick={() => setCurrentSlide(prev => Math.min(totalSlides, prev + 1))}
              disabled={currentSlide === totalSlides}
              className="text-xs font-bold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded"
            >
              Keyingi slayd ▶
            </button>
          </div>

        </div>

        {/* O'ng ustun: Kamera, Taymer, Yozuv va Proctoring Paneli */}
        <div className="space-y-5">
          
          {/* 5 Daqiqalik Qat'iy Taymer (Real-vaqt SVG teskari hisoblovchi) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                5 Daqiqalik Jonli Taqdimot Taymeri
              </span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                FR-3.3 (Qat'iy)
              </span>
            </div>

            {/* Dumaloq SVG teskari hisoblovchi vidjet */}
            <div className="relative w-36 h-36 mx-auto my-3 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-100"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`transition-all duration-1000 ease-linear ${
                    secondsLeft < 60
                      ? 'stroke-rose-500'
                      : secondsLeft < 120
                      ? 'stroke-amber-500'
                      : 'stroke-indigo-600'
                  }`}
                  strokeWidth="8"
                  strokeDasharray={263.89}
                  strokeDashoffset={263.89 * (1 - secondsLeft / 300)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Markaziy raqamli hisob */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-black font-mono tracking-tight ${
                  secondsLeft < 60 ? 'text-rose-600 animate-pulse' : 'text-slate-900'
                }`}>
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                  {secondsLeft === 0 ? "Vaqt tugadi" : isRecording ? "Yozib olinmoqda" : isRunning ? "Taqdimot" : "Kutilmoqda"}
                </span>
              </div>
            </div>
            
            {/* Yozib olish va Taymer boshqaruvi */}
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-center gap-2">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex-1 text-xs font-bold py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center gap-1.5 shadow transition active:scale-95"
                  >
                    <Circle className="w-3.5 h-3.5 fill-current animate-pulse" />
                    <span>Taqdimotni Boshlash va Yozib Olish</span>
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex-1 text-xs font-bold py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center gap-1.5 shadow transition active:scale-95"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Yozuvni To‘xtatish</span>
                  </button>
                )}

                <button
                  onClick={() => { setIsRunning(false); setIsRecording(false); setSecondsLeft(300); }}
                  className="text-xs font-semibold px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                  title="Taymerni qayta o'rnatish"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Yozib olingan videoni yuklab olish */}
              {recordedVideoUrl && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-left">
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Videoyozuv tayyor!</p>
                    <p className="text-[10px] text-emerald-700">Hajmi: {CryptoService.formatBytes(recordedVideoSize)} (.webm)</p>
                  </div>
                  <a
                    href={recordedVideoUrl}
                    download="Magistrant_5_Daqiqalik_Taqdimot_Videoyozuv.webm"
                    className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow"
                  >
                    <Download className="w-3 h-3" />
                    <span>Yuklab olish</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Talaba Veb-kamerasi va Shaxsni Tasdiqlash */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-700" />
                <span>Jonli Kamera Oqimi (MediaDevices)</span>
              </span>
              <button
                onClick={() => { cameraActive ? stopCamera() : startCamera(); }}
                className="text-[10px] font-semibold text-blue-700 hover:underline"
              >
                {cameraActive ? "Kamerani o'chirish" : "Kamerani yoqish"}
              </button>
            </div>

            {/* Haqiqiy Kamera oynasi yoki Simulyatsiya */}
            <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-300">
              {connectionStatus === 'online' ? (
                <>
                  {cameraActive ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-emerald-500 mx-auto flex items-center justify-center text-emerald-400 font-bold text-base">
                        BB
                      </div>
                      <p className="text-xs font-bold text-white mt-2">Bozorov Bobur Qudrat o‘g‘li</p>
                      <p className="text-[10px] text-slate-400">Kamera simulyatsiyasi (Ishonch: 99.4%)</p>
                    </div>
                  )}

                  {/* Liveness indikatori */}
                  <div className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-xs shadow">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{cameraActive ? "Jonli Video Faol" : "Liveness Tasdiqlangan"}</span>
                  </div>

                  {isRecording && (
                    <div className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse shadow">
                      <Circle className="w-2.5 h-2.5 fill-current" />
                      <span>REC</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-4">
                  <WifiOff className="w-8 h-8 text-rose-500 mx-auto animate-bounce" />
                  <p className="text-xs font-bold text-white mt-2">Aloqa vaqtincha uzildi</p>
                  <p className="text-[10px] text-slate-400">FR-3.8: Texnik hodisa (Jazo yo‘q)</p>
                </div>
              )}
            </div>

            {/* Proctoring Sinovlari Simulyatsiyasi */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                Texnik va Shaxsiy Sinovlar (A2, A3, A4 testlari):
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => simulateFaceCheck('fail')}
                  className="text-[10px] font-semibold p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-left truncate"
                >
                  ⚠️ A2: Begona shaxs urinishi
                </button>
                <button
                  onClick={() => simulateFaceCheck('multiple_faces')}
                  className="text-[10px] font-semibold p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-left truncate"
                >
                  ⚠️ A2: Ikkinchi shaxs kadrda
                </button>
                <button
                  onClick={() => simulateConnectionDrop()}
                  className="text-[10px] font-semibold p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded text-left truncate col-span-2"
                >
                  📶 A4: Internet uzilishi va qayta ulanishi (Texnik)
                </button>
              </div>
            </div>

          </div>

          {/* Hodisalar Jurnali */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 max-h-36 overflow-y-auto font-mono text-[10px] space-y-1 text-slate-600">
            {eventLogs.map((log, i) => (
              <p key={i} className="leading-tight">{log}</p>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
