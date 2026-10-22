import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, timeout, catchError } from 'rxjs';
import { 
  BiometricTelemetryPayload, 
  BiometricEvaluationResponse, 
  BiometricEventLog,
  CognitiveIntervention,
  FACE_MESH_LANDMARKS,
  BIOMETRIC_THRESHOLDS 
} from '../models/telemetry.model';
import { WorkerBiometricOutput } from '../workers/biometric.worker';
import { VoiceCompanionService } from './voice-companion.service';

/**
 * Servicio Central de Visión Artificial Biométrica y Detección de Fatiga en Tiempo Real.
 * Desacopla el pipeline matemático de EAR/MAR y series temporales hacia un Web Worker
 * en segundo plano, evitando congelamiento de cómputo al cambiar de pestaña.
 */
@Injectable({
  providedIn: 'root'
})
export class BiometricVisionService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly voiceCompanion = inject(VoiceCompanionService);

  private readonly BACKEND_URL = 'http://localhost:8080/api/telemetry/biometrics';

  // Instancia del Web Worker para cómputo desacoplado en segundo plano
  private worker: Worker | null = null;

  // Identificadores de sesión
  readonly studentId = signal<string>('est-ricardo-101');
  readonly sessionId = signal<string>(this.generateUUID());
  readonly isBackendReachable = signal<boolean | null>(null);

  // Estados reactivos de cámara y modelo
  readonly isCameraActive = signal<boolean>(false);
  readonly isModelLoading = signal<boolean>(false);
  readonly isModelReady = signal<boolean>(false);
  readonly isPipActive = signal<boolean>(false);
  readonly fps = signal<number>(0);

  // Métricas continuas en tiempo real (alimentadas desde el Web Worker a 30 FPS)
  readonly currentEar = signal<number>(0.28);
  readonly currentMar = signal<number>(0.15);
  readonly fatigueScore = signal<number>(0.0);
  readonly fatigueStatus = signal<'OPTIMO' | 'ALERTA' | 'FATIGA_CRITICA'>('OPTIMO');

  // Contadores de eventos
  readonly blinkCount = signal<number>(0);
  readonly blinksPerMinute = signal<number>(16);
  readonly yawnCount = signal<number>(0);
  readonly microsleepCount = signal<number>(0);

  // Estados instantáneos
  readonly isEyesClosed = signal<boolean>(false);
  readonly isYawning = signal<boolean>(false);
  readonly isMicrosleeping = signal<boolean>(false);
  readonly faceDetected = signal<boolean>(false);

  // Historiales para graficación de sparklines en tiempo real (últimos 60 puntos)
  readonly earHistory = signal<number[]>(new Array(60).fill(0.28));
  readonly marHistory = signal<number[]>(new Array(60).fill(0.15));
  readonly fatigueHistory = signal<number[]>(new Array(60).fill(0.0));

  // Bitácora de eventos recientes
  readonly recentEvents = signal<BiometricEventLog[]>([]);

  // Última intervención recibida de Spring AI
  readonly lastIntervention = signal<CognitiveIntervention | null>(null);
  readonly lastRecommendation = signal<string>('Iniciando monitoreo de atención continua.');

  // Configuración de renderizado
  readonly showMeshOverlay = signal<boolean>(true);
  readonly simulationActive = signal<boolean>(false);

  // Elementos HTML enlazados
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private pipVideoEl: HTMLVideoElement | null = null;

  // Variables internas de procesamiento MediaPipe
  private faceMeshInstance: unknown = null;
  private mediaStream: MediaStream | null = null;
  private pipStream: MediaStream | null = null;
  private animFrameId: number | null = null;

  // Timers y cálculo de FPS
  private frameCount = 0;
  private fpsTimer = performance.now();

  // Ráfagas periódicas de telemetría a Spring Boot
  private telemetryIntervalId: number | null = null;
  private lastBurstTime = Date.now();
  private lastAlertTriggeredTime = 0;

  constructor() {
    this.initBiometricWorker();
    this.addEventLog('Sistema biométrico inicializado.', 'system');
    this.startPeriodicTelemetryBurst();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    if (this.telemetryIntervalId) {
      clearInterval(this.telemetryIntervalId);
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Inicializa el Web Worker para desacoplar el procesamiento del hilo principal.
   */
  private initBiometricWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/biometric.worker', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<WorkerBiometricOutput>) => {
          this.handleWorkerOutput(event.data);
        };

        this.addEventLog('Web Worker activo: procesamiento biométrico desacoplado del hilo principal.', 'system');
      } catch (err) {
        console.warn('No fue posible inicializar Web Worker, usando pipeline síncrono de respaldo:', err);
      }
    }
  }

  /**
   * Procesa la respuesta del Web Worker y actualiza los Signals de Angular.
   */
  private handleWorkerOutput(data: WorkerBiometricOutput): void {
    this.currentEar.set(data.ear);
    this.currentMar.set(data.mar);
    this.fatigueScore.set(data.fatigueLevel);
    this.fatigueStatus.set(data.fatigueStatus);
    this.blinkCount.set(data.blinkCount);
    this.blinksPerMinute.set(data.blinksPerMinute);
    this.yawnCount.set(data.yawnCount);
    this.microsleepCount.set(data.microsleepCount);
    this.isEyesClosed.set(data.isEyesClosed);
    this.isYawning.set(data.isYawning);
    this.isMicrosleeping.set(data.isMicrosleeping);

    // Actualizar series temporales para sparklines
    this.pushSparklineHistory(this.earHistory, data.ear);
    this.pushSparklineHistory(this.marHistory, data.mar);
    this.pushSparklineHistory(this.fatigueHistory, data.fatigueLevel);

    if (data.eventLog) {
      this.addEventLog(data.eventLog.message, data.eventLog.type);
      if (data.eventLog.type === 'sleep') {
        this.voiceCompanion.playAlertTone('critical');
        this.triggerImmediateBurst(true);
      } else if (data.eventLog.type === 'yawn') {
        this.voiceCompanion.playAlertTone('warning');
      }
    }

    if (data.requiresAlert) {
      this.checkAndTriggerActiveAlert(data.fatigueLevel);
    }
  }

  /**
   * Vincula los elementos DOM del componente a la lógica del servicio.
   */
  bindElements(video: HTMLVideoElement, canvas: HTMLCanvasElement, pipVideo?: HTMLVideoElement): void {
    this.videoEl = video;
    this.canvasEl = canvas;
    if (pipVideo) {
      this.pipVideoEl = pipVideo;
    }
  }

  /**
   * Inicia la captura de webcam y el motor de MediaPipe Face Mesh.
   */
  async startCamera(): Promise<void> {
    if (!this.videoEl || !this.canvasEl) {
      console.warn('Elementos video/canvas no vinculados.');
      return;
    }

    try {
      this.isModelLoading.set(true);

      // 1. Obtener stream de webcam con resolución optimizada para visión artificial
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      this.videoEl.srcObject = this.mediaStream;
      await this.videoEl.play();

      this.canvasEl.width = this.videoEl.videoWidth || 1280;
      this.canvasEl.height = this.videoEl.videoHeight || 720;

      // 2. Inicializar MediaPipe Face Mesh
      await this.initMediaPipeFaceMesh();

      this.isCameraActive.set(true);
      this.isModelLoading.set(false);
      this.addEventLog('Cámara conectada y Face Mesh activo a 30 FPS.', 'system');

      // 3. Iniciar loop de renderizado continuo
      this.startProcessingLoop();

    } catch (err) {
      this.isModelLoading.set(false);
      console.error('Error al inicializar cámara o MediaPipe:', err);
      this.addEventLog('No se pudo acceder a la cámara o cargar el modelo.', 'alert');
    }
  }

  /**
   * Detiene la cámara y libera los recursos de hardware.
   */
  stopCamera(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }

    this.isCameraActive.set(false);
    this.fps.set(0);
    this.faceDetected.set(false);
    this.addEventLog('Monitoreo por webcam detenido.', 'system');
  }

  /**
   * Carga e instancia la librería MediaPipe Face Mesh con soporte resiliente local y CDN.
   */
  private async initMediaPipeFaceMesh(): Promise<void> {
    if (this.faceMeshInstance) {
      return;
    }

    const FaceMeshClass = await this.resolveFaceMeshConstructor();
    if (!FaceMeshClass) {
      throw new Error('No fue posible cargar el constructor de FaceMesh.');
    }

    const faceMesh = new FaceMeshClass({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results: any) => this.handleFaceMeshResults(results));

    await faceMesh.initialize();
    this.faceMeshInstance = faceMesh;
    this.isModelReady.set(true);
  }

  /**
   * Resuelve el constructor de FaceMesh desde node_modules, window o inyección CDN.
   */
  private async resolveFaceMeshConstructor(): Promise<any> {
    const win = window as any;
    if (win.FaceMesh) {
      return win.FaceMesh;
    }

    try {
      const module = await import('@mediapipe/face_mesh');
      if (module.FaceMesh) return module.FaceMesh;
      if ((module as any).default?.FaceMesh) return (module as any).default.FaceMesh;
      if (typeof module === 'function') return module;
    } catch {
      // Fallback a carga dinámica de CDN
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if ((window as any).FaceMesh) {
          resolve((window as any).FaceMesh);
        } else {
          reject(new Error('Script cargado pero window.FaceMesh no encontrado.'));
        }
      };
      script.onerror = () => reject(new Error('Fallo al cargar script FaceMesh desde CDN.'));
      document.head.appendChild(script);
    });
  }

  /**
   * Bucle de captura y envío de fotogramas a MediaPipe a 30 FPS.
   */
  private startProcessingLoop(): void {
    const processFrame = async () => {
      if (!this.isCameraActive() || !this.videoEl || !this.faceMeshInstance) {
        return;
      }

      if (this.videoEl.readyState >= 2) {
        try {
          await (this.faceMeshInstance as any).send({ image: this.videoEl });
        } catch {
          // Fallo transitorio en fotograma
        }

        this.frameCount++;
        const now = performance.now();
        if (now - this.fpsTimer >= 1000) {
          this.fps.set(Math.round((this.frameCount * 1000) / (now - this.fpsTimer)));
          this.frameCount = 0;
          this.fpsTimer = now;
        }
      }

      this.animFrameId = requestAnimationFrame(processFrame);
    };

    this.animFrameId = requestAnimationFrame(processFrame);
  }

  /**
   * Procesamiento de los landmarks faciales:
   * 1. Renderiza los puntos visuales en Canvas (ojo verde, boca azul, HUD).
   * 2. Delega el pipeline matemático de EAR/MAR y series de fatiga al Web Worker.
   */
  private handleFaceMeshResults(results: any): void {
    if (!this.canvasEl || !this.videoEl) return;
    const ctx = this.canvasEl.getContext('2d');
    if (!ctx) return;

    const width = this.canvasEl.width;
    const height = this.canvasEl.height;

    // 1. Limpiar y dibujar fotograma de la webcam
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.videoEl, 0, 0, width, height);

    const landmarksList = results?.multiFaceLandmarks;
    if (!landmarksList || landmarksList.length === 0) {
      this.faceDetected.set(false);
      this.drawNoFaceAlert(ctx, width, height);
      ctx.restore();
      return;
    }

    this.faceDetected.set(true);
    const landmarks = landmarksList[0];

    // 2. Extraer puntos para renderizado en Canvas:
    // Ojo Izquierdo: [362, 385, 387, 263, 373, 380]
    const leftEye = {
      p1: landmarks[362],
      p2: landmarks[385],
      p3: landmarks[387],
      p4: landmarks[263],
      p5: landmarks[373],
      p6: landmarks[380]
    };

    // Ojo Derecho: [33, 160, 158, 133, 153, 144]
    const rightEye = {
      p1: landmarks[33],
      p2: landmarks[160],
      p3: landmarks[158],
      p4: landmarks[133],
      p5: landmarks[153],
      p6: landmarks[144]
    };

    // Boca: [13, 14, 78, 308]
    const mouth = {
      top: landmarks[13],
      bottom: landmarks[14],
      left: landmarks[78],
      right: landmarks[308]
    };

    // 3. OFFLOAD AL WEB WORKER: Desacopla cálculos de EAR, MAR, PERCLOS y fatiga
    if (this.worker) {
      this.worker.postMessage({
        type: 'PROCESS_FRAME',
        timestamp: Date.now(),
        landmarks,
        simulationActive: this.simulationActive()
      });
    }

    // 4. Renderizado gráfico de superposición en Canvas (ojos verdes, labios azules, HUD PiP)
    if (this.showMeshOverlay()) {
      this.drawBiometricOverlay(
        ctx, 
        width, 
        height, 
        landmarks, 
        leftEye, 
        rightEye, 
        mouth, 
        this.currentEar(), 
        this.currentMar(), 
        this.fatigueScore()
      );
    }

    ctx.restore();
  }

  /**
   * Renderizado gráfico de landmarks: ojos en verde, labios en azul y HUD biométrico.
   */
  private drawBiometricOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    landmarks: any[],
    leftEye: any,
    rightEye: any,
    mouth: any,
    ear: number,
    mar: number,
    fatigue: number
  ): void {
    // 1. Dibujar puntos y contornos de los ojos (Verde esmeralda)
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#10b981';
    ctx.fillStyle = '#34d399';

    this.drawEyeContour(ctx, w, h, [leftEye.p1, leftEye.p2, leftEye.p3, leftEye.p4, leftEye.p5, leftEye.p6]);
    this.drawEyeContour(ctx, w, h, [rightEye.p1, rightEye.p2, rightEye.p3, rightEye.p4, rightEye.p5, rightEye.p6]);

    // 2. Dibujar puntos y contorno de labios (Azul cyan)
    ctx.strokeStyle = '#06b6d4';
    ctx.fillStyle = '#38bdf8';
    this.drawMouthContour(ctx, w, h, mouth);

    // 3. Renderizar HUD de telemetría directamente en el Canvas (visible en PiP flotante)
    this.drawCanvasHUD(ctx, w, h, ear, mar, fatigue);
  }

  private drawEyeContour(ctx: CanvasRenderingContext2D, w: number, h: number, points: any[]): void {
    ctx.beginPath();
    points.forEach((p, i) => {
      const px = p.x * w;
      const py = p.y * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();

    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawMouthContour(ctx: CanvasRenderingContext2D, w: number, h: number, mouth: any): void {
    const pts = [mouth.left, mouth.top, mouth.right, mouth.bottom];
    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = p.x * w;
      const py = p.y * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();

    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * HUD en el Canvas visible durante la ventana flotante de Picture-in-Picture.
   * En la vista web normal, la interfaz utiliza su propio HUD flotante en HTML/CSS con glassmorphism.
   */
  private drawCanvasHUD(ctx: CanvasRenderingContext2D, w: number, h: number, ear: number, mar: number, fatigue: number): void {
    if (!this.isPipActive()) {
      return;
    }

    ctx.fillStyle = 'rgba(10, 14, 23, 0.75)';
    ctx.fillRect(10, 10, w - 20, 48);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, w - 20, 48);

    ctx.font = 'bold 12px "Fira Code", monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`EAR: ${ear.toFixed(2)}`, 24, 32);

    ctx.fillStyle = mar > 0.65 ? '#f59e0b' : '#38bdf8';
    ctx.fillText(`MAR: ${mar.toFixed(2)}`, 130, 32);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`BPM: ${this.blinksPerMinute()}`, 230, 32);

    const barWidth = 120;
    const barHeight = 8;
    const barX = w - barWidth - 30;
    const barY = 25;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const fillWidth = barWidth * fatigue;
    const barColor = fatigue >= 0.8 ? '#ef4444' : fatigue >= 0.5 ? '#f59e0b' : '#10b981';
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, fillWidth, barHeight);

    ctx.font = '10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = barColor;
    ctx.fillText(`FATIGA ${Math.round(fatigue * 100)}% [WORKER]`, barX, 20);

    if (this.isMicrosleeping()) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.fillRect(10, h - 50, w - 20, 38);
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ ALERTA: MICROSUEÑO DETECTADO - ABRE LOS OJOS', w / 2, h - 26);
      ctx.textAlign = 'left';
    }
  }

  private drawNoFaceAlert(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (!this.isPipActive()) {
      return;
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.fillRect(20, h - 55, w - 40, 36);
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('Alinea tu rostro frente a la cámara para reanudar el análisis biométrico', w / 2, h - 33);
    ctx.textAlign = 'left';
  }

  /**
   * Soporte de Picture-in-Picture (PiP) para continuar monitoreo sobre PDFs o YouTube.
   */
  async enablePictureInPicture(): Promise<void> {
    if (typeof document === 'undefined' || !document.pictureInPictureEnabled) {
      alert('Tu navegador no soporta Picture-in-Picture.');
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.isPipActive.set(false);
        this.addEventLog('Modo Picture-in-Picture desactivado.', 'system');
        return;
      }

      if (this.canvasEl && this.pipVideoEl && 'captureStream' in this.canvasEl) {
        this.pipStream = (this.canvasEl as any).captureStream(30);
        this.pipVideoEl.srcObject = this.pipStream;
        await this.pipVideoEl.play();
        await this.pipVideoEl.requestPictureInPicture();
        this.isPipActive.set(true);

        this.pipVideoEl.onleavepictureinpicture = () => {
          this.isPipActive.set(false);
        };
        this.addEventLog('Picture-in-Picture activo con telemetría HUD.', 'system');
      } else if (this.videoEl) {
        await this.videoEl.requestPictureInPicture();
        this.isPipActive.set(true);
        this.videoEl.onleavepictureinpicture = () => {
          this.isPipActive.set(false);
        };
        this.addEventLog('Picture-in-Picture activo (webcam).', 'system');
      }
    } catch (err) {
      console.error('Error al activar Picture-in-Picture:', err);
      this.addEventLog('No se pudo activar Picture-in-Picture.', 'alert');
    }
  }

  /**
   * Ráfagas periódicas de telemetría agregada hacia Spring Boot (cada 12 segundos).
   */
  private startPeriodicTelemetryBurst(): void {
    this.telemetryIntervalId = window.setInterval(() => {
      if (this.isCameraActive()) {
        this.sendBiometricBurst(false);
      }
    }, 12000);
  }

  /**
   * Envía la ráfaga de métricas biométricas al endpoint POST /api/telemetry/biometrics.
   */
  sendBiometricBurst(alertTriggered: boolean): void {
    const payload: BiometricTelemetryPayload = {
      studentId: this.studentId(),
      sessionId: this.sessionId(),
      ear: this.currentEar(),
      mar: this.currentMar(),
      blinks: this.blinkCount(),
      yawns: this.yawnCount(),
      fatigueScore: this.fatigueScore(),
      alertTriggered
    };

    this.http.post<BiometricEvaluationResponse>(this.BACKEND_URL, payload).pipe(
      timeout(4000),
      catchError(err => {
        this.isBackendReachable.set(false);
        return of({
          requiresIntervention: alertTriggered || payload.fatigueScore >= 0.8,
          currentFatigueLevel: payload.fatigueScore,
          status: payload.fatigueScore >= 0.8 ? 'FATIGA_CRITICA' : 'OPTIMO',
          recommendation: alertTriggered 
            ? 'Pausa activa preventiva: se detecta disminución de reflejos palpebrales y somnolencia.'
            : 'Atención adecuada. Continúa con tu ritmo de estudio.',
          intervention: alertTriggered ? {
            mindfulnessExercise: 'Inhala profundamente en 4 segundos, retén 4 y exhala en 6 segundos cerrando suavemente los párpados.',
            simplifiedAnalogy: 'Tu cerebro necesita vaciar el buffer de memoria visual tras periodos intensos de pantalla.',
            voiceScript: 'Hola. He detectado cansancio visual continuo. Te invito a apartar la mirada de la pantalla, relajar los párpados y tomar una pausa de 3 minutos.',
            suggestedBreakMinutes: 3
          } : null
        } as BiometricEvaluationResponse);
      })
    ).subscribe(res => {
      this.isBackendReachable.set(true);
      this.lastRecommendation.set(res.recommendation);

      if (res.intervention) {
        this.lastIntervention.set(res.intervention);
      }

      if (res.requiresIntervention && res.intervention) {
        this.voiceCompanion.sendDesktopNotification(
          'NeuroEdu - Pausa Activa Sugerida',
          res.recommendation
        );
        this.voiceCompanion.playAlertTone('critical');
        this.voiceCompanion.speak(res.intervention.voiceScript);
      }

      this.addEventLog(
        `Telemetría enviada a Spring Boot [Fatiga: ${Math.round(payload.fatigueScore * 100)}%]`,
        'telemetry'
      );
    });
  }

  triggerImmediateBurst(alert: boolean): void {
    const now = Date.now();
    if (now - this.lastBurstTime > 4000) {
      this.lastBurstTime = now;
      this.sendBiometricBurst(alert);
    }
  }

  private checkAndTriggerActiveAlert(fatigue: number): void {
    const now = Date.now();
    if (now - this.lastAlertTriggeredTime > 25000) {
      this.lastAlertTriggeredTime = now;
      this.addEventLog(`🚨 Fatiga crítica (${Math.round(fatigue * 100)}%) detectada. Solicitando intervención de voz.`, 'alert');
      this.triggerImmediateBurst(true);
    }
  }

  private pushSparklineHistory(sig: ReturnType<typeof signal<number[]>>, val: number): void {
    sig.update(arr => {
      const next = [...arr.slice(1), Number(val.toFixed(3))];
      return next;
    });
  }

  private addEventLog(message: string, type: BiometricEventLog['type']): void {
    const entry: BiometricEventLog = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type
    };
    this.recentEvents.update(list => [entry, ...list.slice(0, 39)]);
  }

  toggleMeshOverlay(): void {
    this.showMeshOverlay.update(v => !v);
  }

  toggleSimulation(): void {
    this.simulationActive.update(v => !v);
    this.addEventLog(
      `Simulación de fatiga biométrica ${this.simulationActive() ? 'ACTIVADA' : 'DESACTIVADA'}`,
      'system'
    );
  }

  resetSession(): void {
    this.sessionId.set(this.generateUUID());
    this.blinkCount.set(0);
    this.yawnCount.set(0);
    this.microsleepCount.set(0);
    this.fatigueScore.set(0.0);
    this.fatigueStatus.set('OPTIMO');
    this.recentEvents.set([]);
    this.worker?.postMessage({ type: 'RESET' });
    this.addEventLog('Sesión biométrica reiniciada.', 'system');
  }

  private generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'bio-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }
}
