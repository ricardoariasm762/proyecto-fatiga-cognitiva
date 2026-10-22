/**
 * Modelos de datos para el Sistema de Detección de Fatiga Biométrica en Tiempo Real
 * (Visión Artificial, MediaPipe Face Mesh, Picture-in-Picture e inferencia Spring Boot).
 */

export interface BiometricTelemetryPayload {
  studentId: string;
  sessionId: string;
  ear: number;
  mar: number;
  blinks: number;
  yawns: number;
  fatigueScore: number;
  alertTriggered: boolean;
}

export interface CognitiveIntervention {
  mindfulnessExercise: string;   // Instrucción breve de respiración
  simplifiedAnalogy: string;     // Metáfora cotidiana del tema o descompresión
  voiceScript: string;           // Guion en 1ra persona para ser narrado por voz
  suggestedBreakMinutes: number; // Tiempo sugerido de pausa activa (ej: 3)
}

export interface BiometricEvaluationResponse {
  requiresIntervention: boolean;
  currentFatigueLevel: number;
  status: 'OPTIMO' | 'ALERTA' | 'FATIGA_CRITICA' | string;
  recommendation: string;
  intervention?: CognitiveIntervention | null;
  fatigueDetected?: boolean;
  confidenceScore?: number;
}

export interface BiometricSessionLogEntry {
  id?: number;
  studentId: string;
  sessionId: string;
  earAverage: number;
  marAverage: number;
  blinkCount: number;
  yawnCount: number;
  fatigueScore: number;
  fatigueState: 'OPTIMO' | 'ALERTA' | 'FATIGA_CRITICA' | string;
  recommendation?: string;
  alertTriggered?: boolean;
  timestamp: string;
}

export interface BiometricEventLog {
  time: string;
  message: string;
  type: 'blink' | 'yawn' | 'sleep' | 'telemetry' | 'alert' | 'system';
}

export interface BackendStatusResponse {
  service: string;
  status: 'ONLINE' | 'OFFLINE';
  modelLoaded: boolean;
  timestamp: string;
}

// Interfaces de compatibilidad para telemetría pedagógica y analítica
export interface EvaluationPayload {
  studentId: string;
  sessionId: string;
  exerciseIndex: number;
  responseTimeSeconds: number;
  isCorrect: boolean;
  inactivitySeconds: number;
}

export interface EvaluationResult {
  fatigueDetected: boolean;
  confidenceScore: number;
  status: string;
  recommendation: string;
  intervention?: CognitiveIntervention | null;
}

export interface TelemetryLogEntry {
  payload: EvaluationPayload;
  result: EvaluationResult;
  timestamp: string;
}

export interface StudentInteractionDto {
  id?: number;
  studentId: string;
  sessionId: string;
  exerciseIndex: number;
  responseTimeSeconds: number;
  isCorrect: boolean;
  inactivitySeconds: number;
  deltaRatio?: number;
  errorRate?: number;
  fatigueDetected?: boolean;
  confidenceScore?: number;
  status?: string;
  recommendation?: string;
  createdAt?: string;
}

// Landmark indexes para MediaPipe Face Mesh
export const FACE_MESH_LANDMARKS = {
  // Ojo Izquierdo: [362, 385, 387, 263, 373, 380]
  leftEye: [362, 385, 387, 263, 373, 380],
  // Ojo Derecho: [33, 160, 158, 133, 153, 144]
  rightEye: [33, 160, 158, 133, 153, 144],
  // Boca / Labios: [13, 14, 78, 308]
  mouth: [13, 14, 78, 308]
} as const;

// Umbrales biométricos
export const BIOMETRIC_THRESHOLDS = {
  blinkEar: 0.22,               // EAR < 0.22 -> ojo cerrado
  microsleepEar: 0.20,          // EAR < 0.20 sostenido
  microsleepDurationMs: 1500,   // > 1.5s -> microsueño crítico
  yawnMar: 0.65,                // MAR > 0.65 sostenido
  yawnDurationMs: 1800,         // > 1.8s -> bostezo detectado
  fatigueAlertThreshold: 0.80   // >= 0.80 -> FATIGA_CRITICA
} as const;
