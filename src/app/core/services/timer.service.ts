import { Injectable, signal, computed, DestroyRef, inject } from '@angular/core';

export interface TimerMetrics {
  responseTimeSeconds: number;
  inactivitySeconds: number;
}

/**
 * Servicio desacoplado para la medición precisa de tiempos de resolución
 * y captura de telemetría pasiva de inactividad inicial.
 */
@Injectable({
  providedIn: 'root'
})
export class TimerService {
  private readonly destroyRef = inject(DestroyRef);

  // ==========================================
  // ESTADO REACTIVO (SIGNALS)
  // ==========================================
  readonly elapsedSeconds = signal<number>(0);
  readonly inactivitySeconds = signal<number>(0);
  readonly hasInteracted = signal<boolean>(false);
  readonly isRunning = signal<boolean>(false);

  // Formato mm:ss calculado
  readonly formattedElapsed = computed(() => {
    const totalSecs = Math.floor(this.elapsedSeconds());
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  private startTime = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private removeListenersFn: (() => void) | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.reset();
    });
  }

  /**
   * Inicia el cronómetro del ejercicio y rearma los sensores pasivos de inactividad.
   */
  start(): void {
    this.reset();

    this.isRunning.set(true);
    this.startTime = performance.now();

    // Actualización de alta resolución cada 100ms para feedback visual fluido
    this.intervalId = setInterval(() => {
      const elapsed = (performance.now() - this.startTime) / 1000;
      this.elapsedSeconds.set(parseFloat(elapsed.toFixed(1)));
    }, 100);

    // Detección pasiva de la primera interacción
    const eventTypes: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];

    const onFirstAction = () => {
      if (!this.hasInteracted() && this.isRunning()) {
        const inactivity = (performance.now() - this.startTime) / 1000;
        this.inactivitySeconds.set(parseFloat(inactivity.toFixed(2)));
        this.hasInteracted.set(true);
        this.detachListeners();
      }
    };

    eventTypes.forEach(evt => {
      window.addEventListener(evt, onFirstAction, { passive: true, once: true });
    });

    this.removeListenersFn = () => {
      eventTypes.forEach(evt => window.removeEventListener(evt, onFirstAction));
      this.removeListenersFn = null;
    };
  }

  /**
   * Registra manualmente la interacción en caso de un evento directo (ej: selección de opción).
   */
  recordManualInteraction(): void {
    if (!this.hasInteracted() && this.isRunning()) {
      const inactivity = (performance.now() - this.startTime) / 1000;
      this.inactivitySeconds.set(parseFloat(inactivity.toFixed(2)));
      this.hasInteracted.set(true);
      this.detachListeners();
    }
  }

  /**
   * Detiene el cronómetro y devuelve las métricas exactas calculadas.
   */
  stop(): TimerMetrics {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const endTime = performance.now();
    const responseTime = parseFloat(((endTime - this.startTime) / 1000).toFixed(2));

    // Si nunca interactuó antes de detener (ej: click directo en enviar), la inactividad es el tiempo total
    const inactivity = this.hasInteracted() 
      ? this.inactivitySeconds() 
      : responseTime;

    this.isRunning.set(false);
    this.detachListeners();

    return {
      responseTimeSeconds: responseTime,
      inactivitySeconds: inactivity
    };
  }

  /**
   * Limpia intervalos y listeners sin guardar métricas.
   */
  reset(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.detachListeners();
    this.elapsedSeconds.set(0);
    this.inactivitySeconds.set(0);
    this.hasInteracted.set(false);
    this.isRunning.set(false);
  }

  private detachListeners(): void {
    if (this.removeListenersFn) {
      this.removeListenersFn();
    }
  }
}
