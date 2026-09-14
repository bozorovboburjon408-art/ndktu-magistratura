export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
}

type NotificationListener = (notifications: AppNotification[]) => void;

export class NotificationService {
  private static notifications: AppNotification[] = [];
  private static listeners: NotificationListener[] = [];
  private static audioCtx: AudioContext | null = null;

  static subscribe(listener: NotificationListener) {
    this.listeners.push(listener);
    listener(this.notifications);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify() {
    this.listeners.forEach(l => l([...this.notifications]));
  }

  // Web Audio API orqali sof sintetik ovozli bildirishnoma (tashqi fayllarsiz)
  private static playSound(type: NotificationType) {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'warning' || type === 'error') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(349.23, now + 0.1);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch {
      // Audio mavjud bo'lmasa yoki foydalanuvchi bloklagan bo'lsa indamay o'tadi
    }
  }

  static show(type: NotificationType, title: string, message: string, duration = 4000) {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const item: AppNotification = { id, type, title, message, timestamp: Date.now(), duration };
    
    this.notifications = [item, ...this.notifications.slice(0, 4)]; // Max 5 ta
    this.notify();
    this.playSound(type);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
    return id;
  }

  static success(title: string, message: string, duration = 4000) {
    return this.show('success', title, message, duration);
  }

  static info(title: string, message: string, duration = 4000) {
    return this.show('info', title, message, duration);
  }

  static warning(title: string, message: string, duration = 5000) {
    return this.show('warning', title, message, duration);
  }

  static error(title: string, message: string, duration = 6000) {
    return this.show('error', title, message, duration);
  }

  static dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();
  }

  static clearAll() {
    this.notifications = [];
    this.notify();
  }
}
