/// <reference lib="webworker" />

/**
 * Web Worker para el Procesamiento Biométrico Facial Desacoplado.
 * Ejecuta en un hilo en segundo plano los cálculos geométricos de EAR, MAR,
 * registro temporal de parpadeos, detección de microsueños, bostezos y
 * cómputo continuo del nivel de fatiga.
 */

export interface Point2D {
  x: number;
  y: number;
  z?: number;
}

export interface WorkerProcessFrameMessage {
  type: 'PROCESS_FRAME';
  timestamp: number;
  landmarks: Point2D[];
  simulationActive?: boolean;
}

export interface WorkerResetMessage {
  type: 'RESET';
}

export type WorkerIncomingMessage = WorkerProcessFrameMessage | WorkerResetMessage;

export interface WorkerBiometricOutput {
  ear: number;
  mar: number;
  fatigueLevel: number;
  fatigueStatus: 'OPTIMO' | 'ALERTA' | 'FATIGA_CRITICA';
  requiresAlert: boolean;
  isEyesClosed: boolean;
  isMicrosleeping: boolean;
  isYawning: boolean;
  blinkCount: number;
  blinksPerMinute: number;
  yawnCount: number;
  microsleepCount: number;
  eventLog?: {
    message: string;
    type: 'blink' | 'yawn' | 'sleep' | 'alert';
  };
}

// ==========================================
// ESTADO INTERNO DEL WORKER (SERIE TEMPORAL)
// ==========================================
let blinkCount = 0;
let yawnCount = 0;
let microsleepCount = 0;
let currentFatigueLevel = 0.0;

// Seguimiento palpebral (EAR)
let eyesClosedStartTime: number | null = null;
let isMicrosleepingState = false;
let blinkTimestamps: number[] = [];
let eyeClosedDurations: Array<{ start: number; end: number }> = [];

// Seguimiento labial (MAR)
let mouthOpenStartTime: number | null = null;
let yawnRecordedForCurrentOpen = false;
let yawnTimestamps: number[] = [];

// Umbrales biométricos
const BLINK_EAR_THRESHOLD = 0.22;
const MICROSLEEP_EAR_THRESHOLD = 0.20;
const MICROSLEEP_DURATION_MS = 1500; // > 1.5s
const YAWN_MAR_THRESHOLD = 0.65;
const YAWN_DURATION_MS = 1800;      // > 1.8s
const FATIGA_CRITICA_THRESHOLD = 0.80;

/**
 * Distancia euclidiana en el plano bidimensional normalizado:
 * ||p1 - p2|| = sqrt((x1 - x2)^2 + (y1 - y2)^2)
 */
function euclideanDistance(p1: Point2D, p2: Point2D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Cálculo de EAR (Eye Aspect Ratio):
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
function calculateEyeEAR(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D,
  p5: Point2D,
  p6: Point2D
): number {
  const v1 = euclideanDistance(p2, p6);
  const v2 = euclideanDistance(p3, p5);
  const h = euclideanDistance(p1, p4);

  if (h === 0) return 0.28;
  return (v1 + v2) / (2.0 * h);
}

/**
 * Cálculo de MAR (Mouth Aspect Ratio):
 * MAR = ||p_top - p_bottom|| / ||p_left - p_right||
 */
function calculateMouthMAR(
  top: Point2D,
  bottom: Point2D,
  left: Point2D,
  right: Point2D
): number {
  const vertical = euclideanDistance(top, bottom);
  const horizontal = euclideanDistance(left, right);

  if (horizontal === 0) return 0.15;
  return vertical / horizontal;
}

/**
 * Resetea el acumulador de la sesión.
 */
function resetState(): void {
  blinkCount = 0;
  yawnCount = 0;
  microsleepCount = 0;
  currentFatigueLevel = 0.0;
  eyesClosedStartTime = null;
  isMicrosleepingState = false;
  blinkTimestamps = [];
  eyeClosedDurations = [];
  mouthOpenStartTime = null;
  yawnRecordedForCurrentOpen = false;
  yawnTimestamps = [];
}

/**
 * Escucha mensajes entrantes desde el hilo principal de Angular.
 */
addEventListener('message', (event: MessageEvent<WorkerIncomingMessage>) => {
  const data = event.data;

  if (data.type === 'RESET') {
    resetState();
    return;
  }

  if (data.type === 'PROCESS_FRAME') {
    const { timestamp, landmarks, simulationActive } = data;

    if (!landmarks || landmarks.length < 388) {
      return;
    }

    // 1. Extracción de puntos de referencia faciales de MediaPipe:
    // Ojo Izquierdo: [362, 385, 387, 263, 373, 380]
    const earLeft = calculateEyeEAR(
      landmarks[362], // p1
      landmarks[385], // p2
      landmarks[387], // p3
      landmarks[263], // p4
      landmarks[373], // p5
      landmarks[380]  // p6
    );

    // Ojo Derecho: [33, 160, 158, 133, 153, 144]
    const earRight = calculateEyeEAR(
      landmarks[33],  // p1
      landmarks[160], // p2
      landmarks[158], // p3
      landmarks[133], // p4
      landmarks[153], // p5
      landmarks[144]  // p6
    );

    let avgEar = (earLeft + earRight) / 2.0;

    // Boca (Labios): [13, 14, 78, 308]
    let mar = calculateMouthMAR(
      landmarks[13],  // top
      landmarks[14],  // bottom
      landmarks[78],  // left
      landmarks[308]  // right
    );

    // Simulación forzada si está activa
    if (simulationActive) {
      avgEar = 0.17;
      mar = 0.72;
    }

    let eventLog: WorkerBiometricOutput['eventLog'];
    let requiresAlert = false;

    // 2. Registro de Dinámica Ocular y Parpadeos
    const isEyesClosed = avgEar < BLINK_EAR_THRESHOLD;

    if (isEyesClosed) {
      if (!eyesClosedStartTime) {
        eyesClosedStartTime = timestamp;
      } else {
        const closedDuration = timestamp - eyesClosedStartTime;
        // Detección de microsueño (> 1.5 segundos con EAR < 0.20)
        if (
          avgEar < MICROSLEEP_EAR_THRESHOLD &&
          closedDuration >= MICROSLEEP_DURATION_MS &&
          !isMicrosleepingState
        ) {
          isMicrosleepingState = true;
          microsleepCount++;
          requiresAlert = true;
          eventLog = {
            message: `⚠️ Microsueño detectado (${(closedDuration / 1000).toFixed(1)}s ojos cerrados)`,
            type: 'sleep'
          };
        }
      }
    } else {
      if (eyesClosedStartTime) {
        const duration = timestamp - eyesClosedStartTime;
        if (duration >= 80 && duration < 1400) {
          // Parpadeo registrado
          blinkCount++;
          blinkTimestamps.push(timestamp);
          eyeClosedDurations.push({ start: eyesClosedStartTime, end: timestamp });
        }
        eyesClosedStartTime = null;
        isMicrosleepingState = false;
      }
    }

    // Limpieza de ventana de parpadeos (> 60 segundos)
    const windowStart60s = timestamp - 60000;
    blinkTimestamps = blinkTimestamps.filter(t => t >= windowStart60s);
    const blinksPerMinute = blinkTimestamps.length;

    // 3. Registro de Dinámica Bucal y Bostezos
    const isYawning = mar > YAWN_MAR_THRESHOLD;

    if (isYawning) {
      if (!mouthOpenStartTime) {
        mouthOpenStartTime = timestamp;
        yawnRecordedForCurrentOpen = false;
      } else {
        const openDuration = timestamp - mouthOpenStartTime;
        // Bostezo sostenido (> 1.8 segundos)
        if (openDuration >= YAWN_DURATION_MS && !yawnRecordedForCurrentOpen) {
          yawnCount++;
          yawnTimestamps.push(timestamp);
          yawnRecordedForCurrentOpen = true;
          eventLog = {
            message: `🥱 Bostezo prolongado detectado (${(openDuration / 1000).toFixed(1)}s)`,
            type: 'yawn'
          };
        }
      }
    } else {
      mouthOpenStartTime = null;
      yawnRecordedForCurrentOpen = false;
    }

    yawnTimestamps = yawnTimestamps.filter(t => t >= windowStart60s);

    // 4. Computar Nivel de Fatiga Continuo (0.00 a 1.00)
    // A) Componente PERCLOS (Porcentaje de Ojos Cerrados en ventana de 30s)
    const windowStart30s = timestamp - 30000;
    eyeClosedDurations = eyeClosedDurations.filter(d => d.end >= windowStart30s);
    let totalClosedMs = 0;
    for (const d of eyeClosedDurations) {
      const effectiveStart = Math.max(d.start, windowStart30s);
      totalClosedMs += Math.max(0, d.end - effectiveStart);
    }
    if (eyesClosedStartTime) {
      const effectiveStart = Math.max(eyesClosedStartTime, windowStart30s);
      totalClosedMs += Math.max(0, timestamp - effectiveStart);
    }
    const perclosRatio = Math.min(1.0, totalClosedMs / 30000);
    const perclosScore = Math.min(0.45, (perclosRatio / 0.20) * 0.45);

    // B) Componente de Anomalía de Frecuencia de Parpadeo
    let blinkScore = 0.0;
    if (blinksPerMinute > 30) {
      blinkScore = Math.min(0.20, ((blinksPerMinute - 30) / 20) * 0.20);
    } else if (blinksPerMinute < 8 && avgEar < 0.25) {
      blinkScore = 0.18;
    }

    // C) Componente de Bostezos Recientes en la ventana
    const recentYawns = yawnTimestamps.length;
    const yawnScore = Math.min(0.35, recentYawns * 0.18);

    // D) Penalización Crítica por Microsueño
    const microsleepBonus = isMicrosleepingState ? 0.45 : 0.0;

    const rawFatigue = Math.max(
      0.0,
      Math.min(1.0, perclosScore + blinkScore + yawnScore + microsleepBonus)
    );

    // Suavizado EMA continuo
    currentFatigueLevel = Number(
      (currentFatigueLevel * 0.90 + rawFatigue * 0.10).toFixed(3)
    );

    if (currentFatigueLevel >= FATIGA_CRITICA_THRESHOLD || isMicrosleepingState) {
      requiresAlert = true;
    }

    let fatigueStatus: WorkerBiometricOutput['fatigueStatus'] = 'OPTIMO';
    if (currentFatigueLevel >= FATIGA_CRITICA_THRESHOLD || isMicrosleepingState) {
      fatigueStatus = 'FATIGA_CRITICA';
    } else if (currentFatigueLevel >= 0.50) {
      fatigueStatus = 'ALERTA';
    }

    // 5. Emitir el resultado procesado mediante postMessage
    const output: WorkerBiometricOutput = {
      ear: Number(avgEar.toFixed(3)),
      mar: Number(mar.toFixed(3)),
      fatigueLevel: currentFatigueLevel,
      fatigueStatus,
      requiresAlert,
      isEyesClosed,
      isMicrosleeping: isMicrosleepingState,
      isYawning,
      blinkCount,
      blinksPerMinute,
      yawnCount,
      microsleepCount,
      eventLog
    };

    postMessage(output);
  }
});
