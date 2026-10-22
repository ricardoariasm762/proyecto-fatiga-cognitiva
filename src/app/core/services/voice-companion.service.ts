import { Injectable, signal, computed } from '@angular/core';

/**
 * Servicio de Acompañamiento por Voz y Audio (Voice Companion).
 * Utiliza:
 * 1. Web Speech API nativa (speechSynthesis) para narrar guiones guiados de descompresión.
 * 2. Web Audio API (AudioContext) para emitir tonos de advertencia y chime ergonómico.
 * 3. Notification API para persistir avisos de escritorio cuando el estudiante está en otra pestaña.
 */
@Injectable({
  providedIn: 'root'
})
export class VoiceCompanionService {
  private readonly synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];

  // Estados reactivos con Signals
  readonly isSpeaking = signal<boolean>(false);
  readonly isPaused = signal<boolean>(false);
  readonly isSupported = signal<boolean>(typeof window !== 'undefined' && 'speechSynthesis' in window);
  readonly availableVoicesCount = signal<number>(0);
  readonly audioAlertsEnabled = signal<boolean>(true);
  readonly notificationsGranted = signal<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Computed state
  readonly isActive = computed(() => this.isSpeaking() || this.isPaused());

  constructor() {
    this.initVoices();
    this.checkNotificationStatus();
  }

  private initVoices(): void {
    if (!this.synth) return;

    const loadVoices = () => {
      this.voices = this.synth!.getVoices();
      this.availableVoicesCount.set(this.voices.length);
    };

    loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  private checkNotificationStatus(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.notificationsGranted.set(Notification.permission === 'granted');
    }
  }

  /**
   * Solicita permisos para notificaciones de escritorio persistentes en segundo plano.
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission === 'granted') {
      this.notificationsGranted.set(true);
      return true;
    }
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      this.notificationsGranted.set(granted);
      return granted;
    } catch {
      return false;
    }
  }

  /**
   * Envía una notificación del sistema operativo incluso si el alumno está en otra pestaña.
   */
  sendDesktopNotification(title: string, body: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: 'biometric-fatigue-alert'
        });
      } catch (e) {
        console.warn('No fue posible lanzar la notificación de escritorio:', e);
      }
    }
  }

  /**
   * Genera un tono de advertencia o timbre acústico mediante Web Audio API sintetizado.
   */
  playAlertTone(type: 'warning' | 'critical' = 'warning'): void {
    if (!this.audioAlertsEnabled()) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'critical') {
        // Tono bitonal de alerta crítica
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
      } else {
        // Chime suave de notificación
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch (e) {
      console.warn('Web Audio API suspendida o bloqueada por política de autoplay:', e);
    }
  }

  /**
   * Reproduce el guion de voz con cadencia y tono relajante.
   */
  speak(text: string, onEnd?: () => void): void {
    if (!this.synth || !this.isSupported()) {
      console.warn('Web Speech API no está soportada o disponible en este navegador.');
      if (onEnd) onEnd();
      return;
    }

    if (!text || text.trim().length === 0) {
      return;
    }

    // Cancelar cualquier síntesis en curso
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    this.currentUtterance = utterance;

    // Configuración acústica para inducir relajación cognitiva
    utterance.lang = 'es-ES';
    utterance.rate = 0.88;   // Ritmo ligeramente pausado y tranquilo
    utterance.pitch = 1.0;   // Tono neutral, cálido y equilibrado
    utterance.volume = 1.0;  // Volumen óptimo

    // Seleccionar una voz en español si está disponible
    const spanishVoice = this.findCalmSpanishVoice();
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onstart = () => {
      this.isSpeaking.set(true);
      this.isPaused.set(false);
    };

    utterance.onpause = () => {
      this.isSpeaking.set(false);
      this.isPaused.set(true);
    };

    utterance.onresume = () => {
      this.isSpeaking.set(true);
      this.isPaused.set(false);
    };

    utterance.onend = () => {
      this.isSpeaking.set(false);
      this.isPaused.set(false);
      this.currentUtterance = null;
      if (onEnd) {
        onEnd();
      }
    };

    utterance.onerror = (event) => {
      console.warn('Evento en SpeechSynthesis:', event.error);
      this.isSpeaking.set(false);
      this.isPaused.set(false);
      this.currentUtterance = null;
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.error('Error al invocar speechSynthesis.speak:', err);
      this.isSpeaking.set(false);
      this.isPaused.set(false);
    }
  }

  pause(): void {
    if (!this.synth) return;
    if (this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.isSpeaking.set(false);
      this.isPaused.set(true);
    }
  }

  resume(): void {
    if (!this.synth) return;
    if (this.synth.paused) {
      this.synth.resume();
      this.isSpeaking.set(true);
      this.isPaused.set(false);
    }
  }

  stop(): void {
    if (!this.synth) return;
    try {
      this.synth.cancel();
    } catch {
      // Ignorar errores al cancelar
    }
    this.isSpeaking.set(false);
    this.isPaused.set(false);
    this.currentUtterance = null;
  }

  togglePlayPause(fallbackText?: string): void {
    if (this.isSpeaking()) {
      this.pause();
    } else if (this.isPaused()) {
      this.resume();
    } else if (fallbackText) {
      this.speak(fallbackText);
    }
  }

  private findCalmSpanishVoice(): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      if (this.synth) {
        this.voices = this.synth.getVoices();
      }
    }

    if (!this.voices || this.voices.length === 0) return null;

    const naturalVoice = this.voices.find(v => 
      v.lang.startsWith('es') && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google'))
    );
    if (naturalVoice) return naturalVoice;

    const regionalVoice = this.voices.find(v => v.lang === 'es-CO' || v.lang === 'es-ES' || v.lang === 'es-MX');
    if (regionalVoice) return regionalVoice;

    return this.voices.find(v => v.lang.startsWith('es')) || null;
  }
}
