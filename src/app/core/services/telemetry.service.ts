import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, timeout, catchError, tap } from 'rxjs';
import { 
  EvaluationPayload, 
  EvaluationResult, 
  TelemetryLogEntry, 
  StudentInteractionDto,
  BackendStatusResponse 
} from '../models/telemetry.model';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService {
  private readonly http = inject(HttpClient);
  private readonly BASE_URL = 'http://localhost:8080/api/telemetry';

  // ==========================================
  // ESTADO GLOBAL REACTIVO DE LA SESIÓN
  // ==========================================
  readonly studentId = signal<string>('est-ricardo-101');
  readonly sessionId = signal<string>(this.generateUUID());
  readonly isBackendReachable = signal<boolean | null>(null);
  readonly lastPayload = signal<EvaluationPayload | null>(null);
  readonly lastResult = signal<EvaluationResult | null>(null);
  readonly sessionHistory = signal<TelemetryLogEntry[]>([]);
  readonly simulationTriggerFatigue = signal<boolean>(false);

  constructor() {
    this.checkBackendHealth();
  }

  /**
   * Envía la telemetría del ejercicio resuelto al backend en Spring Boot.
   * Cuenta con timeout de 4s y fallback resiliente para nunca bloquear la prueba.
   */
  evaluateInteraction(payload: EvaluationPayload): Observable<EvaluationResult> {
    this.lastPayload.set(payload);

    return this.http.post<EvaluationResult>(`${this.BASE_URL}/evaluate`, payload).pipe(
      timeout(4000),
      tap({
        next: (result) => {
          this.isBackendReachable.set(true);
          
          const defaultSimulatedIntervention = {
            mindfulnessExercise: 'Inhala profundamente por la nariz en 4 segundos, sostén 4 segundos y exhala en 6 segundos.',
            simplifiedAnalogy: 'Tu mente es como la memoria RAM: cuando se satura de instrucciones, una pausa de 3 minutos restaura su máxima agilidad.',
            voiceScript: 'Hola. Es momento de hacer una pausa consciente. Aparta la mirada de la pantalla, relaja tus hombros y escucha a tu tutor de descanso. Respira con calma.',
            suggestedBreakMinutes: 3
          };

          // Soporte para simulación de fatiga si el evaluador lo activó en UI
          const effectiveResult: EvaluationResult = this.simulationTriggerFatigue()
            ? {
                fatigueDetected: true,
                confidenceScore: 0.93,
                status: 'FATIGA_COGNITIVA_ACTIVA',
                recommendation: 'Alerta simulada: Se han detectado indicios de fatiga cognitiva en tus métricas de respuesta.',
                intervention: result.intervention || defaultSimulatedIntervention
              }
            : result;

          this.lastResult.set(effectiveResult);
          this.sessionHistory.update(list => [
            ...list,
            { payload, result: effectiveResult, timestamp: new Date().toLocaleTimeString() }
          ]);
        }
      }),
      catchError((error: HttpErrorResponse | Error) => {
        this.isBackendReachable.set(false);
        console.warn(`[TelemetryService] Backend offline en ${this.BASE_URL}. Activando modo resiliente.`, error);

        const simulatedIntervention = {
          mindfulnessExercise: 'Inhala profundamente por la nariz en 4 segundos, sostén 4 segundos y exhala en 6 segundos.',
          simplifiedAnalogy: 'Tu mente es como la memoria de un procesador: un reinicio consciente de 3 minutos devuelve su máxima fluidez.',
          voiceScript: 'Hola. He notado que tu mente ha estado trabajando con intensidad. Aparta la mirada de la pantalla, relaja tus hombros y respira conmigo durante esta pausa.',
          suggestedBreakMinutes: 3
        };

        const fallbackResult: EvaluationResult = this.simulationTriggerFatigue()
          ? {
              fatigueDetected: true,
              confidenceScore: 0.91,
              status: 'FATIGA_COGNITIVA_ACTIVA',
              recommendation: 'Alerta simulada: Se detecta sobrecarga cognitiva por incremento de latencia y pausas prolongadas.',
              intervention: simulatedIntervention
            }
          : {
              fatigueDetected: false,
              confidenceScore: 0.0,
              status: 'ATENCION_OPTIMA',
              recommendation: 'Evaluación local activa: servidor de inferencia no disponible temporalmente.'
            };

        this.lastResult.set(fallbackResult);
        this.sessionHistory.update(list => [
          ...list,
          { payload, result: fallbackResult, timestamp: new Date().toLocaleTimeString() }
        ]);

        return of(fallbackResult);
      })
    );
  }

  /**
   * Consulta el estado de salud del backend y del modelo ONNX.
   */
  checkBackendHealth(): void {
    this.http.get<BackendStatusResponse>(`${this.BASE_URL}/status`).pipe(
      timeout(2500),
      catchError(() => of(null))
    ).subscribe(res => {
      this.isBackendReachable.set(res !== null && res.status === 'ONLINE');
    });
  }

  /**
   * Obtiene las interacciones persistidas en base de datos para la sesión.
   */
  fetchSessionHistory(sessionId: string): Observable<StudentInteractionDto[]> {
    return this.http.get<StudentInteractionDto[]>(`${this.BASE_URL}/session/${sessionId}`).pipe(
      timeout(3000),
      catchError(() => of([]))
    );
  }

  /**
   * Reinicia la sesión con un nuevo UUID y limpia el historial en memoria.
   */
  resetSession(): void {
    this.sessionId.set(this.generateUUID());
    this.sessionHistory.set([]);
    this.lastPayload.set(null);
    this.lastResult.set(null);
    this.checkBackendHealth();
  }

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'sess-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }
}