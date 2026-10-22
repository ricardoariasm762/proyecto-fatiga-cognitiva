import { Component, input, output, signal, computed, inject, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationResult, CognitiveIntervention } from '../../../core/models/telemetry.model';
import { VoiceCompanionService } from '../../../core/services/voice-companion.service';
import { TimeFormatPipe } from '../../pipes/time-format.pipe';
import { StatBadgeComponent } from '../stat-badge/stat-badge.component';

@Component({
  selector: 'app-fatigue-modal',
  standalone: true,
  imports: [CommonModule, TimeFormatPipe, StatBadgeComponent],
  template: `
    @if (isOpen()) {
      <div 
        class="modal-backdrop visual-rest-backdrop" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-zen-title"
        (click)="handleBackdropClick($event)">
        
        <div class="modal-card zen-card" (click)="$event.stopPropagation()">
          
          <!-- Orbes de luz ambiental biomimética decorativos -->
          <div class="ambient-glow glow-top-left" aria-hidden="true"></div>
          <div class="ambient-glow glow-bottom-right" aria-hidden="true"></div>

          <!-- Encabezado con estado y modo descanso visual -->
          <div class="zen-header">
            <div class="status-row">
              <app-stat-badge [status]="alert()?.status || 'FATIGA_COGNITIVA_ACTIVA'"></app-stat-badge>
              <span class="zen-badge">
                <span class="zen-dot"></span>
                PROTOCOLO RESTAURADOR 4-7-8
              </span>
              @if (alert()) {
                <span class="confidence-tag">
                  Certeza ONNX: {{ ((alert()?.confidenceScore || 0.85) * 100).toFixed(0) }}%
                </span>
              }
            </div>

            <h2 id="modal-zen-title" class="zen-title">Descompresión Ocular 4-7-8</h2>
            <p class="zen-invitation">
              Fija la mirada en un punto distante. Deja caer los hombros y sincroniza tu respiración con el orbe bioluminiscente.
            </p>
          </div>

          <!-- Núcleo Multimodal: Orbe de Respiración 4-7-8 y Reloj -->
          <div class="multimodal-core">
            
            <!-- Etapa de Respiración Orgánica -->
            <div class="breathing-stage">
              <!-- Halo exterior dinámico -->
              <div 
                class="halo-wave" 
                [class.phase-inhale]="phaseState() === 'inhale'"
                [class.phase-hold]="phaseState() === 'hold'"
                [class.phase-exhale]="phaseState() === 'exhale'"
                [class.paused]="isTimerPaused()">
              </div>

              <!-- Anillo concéntrico de precisión bio-óptica -->
              <div class="orbit-ring"></div>

              <!-- Orbe central biomimético -->
              <div 
                class="breathing-sphere" 
                [class.phase-inhale]="phaseState() === 'inhale'"
                [class.phase-hold]="phaseState() === 'hold'"
                [class.phase-exhale]="phaseState() === 'exhale'"
                [class.paused]="isTimerPaused()">
                
                <div class="breathing-inner">
                  <span class="phase-tag">{{ breathingPhase() }}</span>
                  <span class="phase-countdown">{{ phaseSecondsLeft() }}s</span>
                  <span class="session-clock">{{ remainingSeconds() | timeFormat }}</span>
                  <span class="session-label">Restante</span>
                </div>
              </div>
            </div>

            <!-- Cita Neuro-cognitiva tranquilizadora -->
            <p class="neuro-quote">
              “Relajando la musculatura ciliar. Liberando la fijación monótona de la fóvea...”
            </p>

            <!-- Barra Scaffolding Acústica Flotante (Voice Companion & Player) -->
            <div class="voice-controls-bar">
              <div class="voice-status">
                <div class="audio-waves" [class.animating]="voiceCompanion.isSpeaking()" aria-hidden="true">
                  <span class="bar bar-1"></span>
                  <span class="bar bar-2"></span>
                  <span class="bar bar-3"></span>
                  <span class="bar bar-4"></span>
                  <span class="bar bar-5"></span>
                </div>
                <div class="voice-text-group">
                  <span class="voice-title">Voz Neuro-Guía (Paisaje 432Hz)</span>
                  <span class="voice-indicator-text">
                    @if (voiceCompanion.isSpeaking()) {
                      Narrando inducción guiada...
                    } @else if (voiceCompanion.isPaused()) {
                      Voz en pausa
                    } @else {
                      Inducción de voz completada
                    }
                  </span>
                </div>
              </div>

              <div class="voice-actions">
                <button 
                  type="button" 
                  class="btn-audio-toggle"
                  [attr.aria-label]="voiceCompanion.isSpeaking() ? 'Pausar locución de voz' : 'Escuchar locución de voz'"
                  (click)="toggleVoice()">
                  @if (voiceCompanion.isSpeaking()) {
                    <span class="audio-icon">⏸️</span>
                    <span>Pausar Voz</span>
                  } @else {
                    <span class="audio-icon">🔊</span>
                    <span>{{ voiceCompanion.isPaused() ? 'Reanudar' : 'Escuchar' }}</span>
                  }
                </button>
              </div>
            </div>
          </div>

          <!-- Contenido Pedagógico: Metáfora y Ejercicio de Respiración -->
          <div class="zen-content-grid">
            
            <!-- Tarjeta 1: Ejercicio Guiado de Mindfulness -->
            <div class="zen-box mindfulness-box">
              <div class="box-icon" aria-hidden="true">🫁</div>
              <div class="box-body">
                <h3 class="box-title">Ejercicio de Respiración Diafragmática</h3>
                <p class="box-text">{{ activeIntervention().mindfulnessExercise }}</p>
              </div>
            </div>

            <!-- Tarjeta 2: Metáfora Intuitiva / Analogía Cotidiana -->
            <div class="zen-box analogy-box">
              <div class="box-icon" aria-hidden="true">💡</div>
              <div class="box-body">
                <h3 class="box-title">Analogía Pedagógica Desmitificadora</h3>
                <p class="box-text">{{ activeIntervention().simplifiedAnalogy }}</p>
              </div>
            </div>
          </div>

          <!-- Botones de Acción del Modal -->
          <div class="modal-footer-actions">
            <button 
              type="button" 
              class="btn btn-secondary"
              (click)="skipBreak()">
              Cerrar & Reanudar Telemetría
            </button>

            <button 
              type="button" 
              class="btn btn-extend"
              (click)="extendBreak(60)"
              title="Añadir 1 minuto adicional de calma">
              +1 Minuto de Calma
            </button>

            @if (remainingSeconds() === 0) {
              <button 
                type="button" 
                class="btn btn-complete"
                (click)="finishBreak()">
                ✨ Pausa completada, continuar
              </button>
            }
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    /* ==========================================================================
       MODAL DE PAUSA ZEN / DESCANSO MULTIMODAL RESPONSIVE
       Diseño Ethereal Biomimetic coherente con Tema Claro y Oscuro
       ========================================================================== */
    .modal-backdrop.visual-rest-backdrop {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at center, rgba(11, 15, 18, 0.88) 0%, rgba(5, 8, 10, 0.96) 100%);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(0.5rem, 2.5vw, 1.25rem);
      z-index: 1000;
      animation: restFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Adaptación a tema claro para el backdrop */
    :host-context([data-theme="light"]) .modal-backdrop.visual-rest-backdrop,
    :host-context(html.light) .modal-backdrop.visual-rest-backdrop {
      background: radial-gradient(circle at center, rgba(235, 245, 240, 0.88) 0%, rgba(215, 230, 224, 0.95) 100%);
    }

    @keyframes restFadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-card.zen-card {
      position: relative;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 24px;
      box-shadow: var(--shadow-xl), 0 0 50px var(--primary-glow);
      max-width: 620px;
      width: 100%;
      max-height: min(94vh, 790px);
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      padding: clamp(1rem, 2.5vw, 1.5rem);
      display: flex;
      flex-direction: column;
      gap: clamp(0.75rem, 1.8vw, 1.15rem);
      color: var(--text-primary);
      animation: modalSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Scrollbar sutil y orgánico */
    .modal-card.zen-card::-webkit-scrollbar {
      width: 5px;
    }
    .modal-card.zen-card::-webkit-scrollbar-track {
      background: transparent;
    }
    .modal-card.zen-card::-webkit-scrollbar-thumb {
      background: var(--border-subtle);
      border-radius: 10px;
    }
    .modal-card.zen-card::-webkit-scrollbar-thumb:hover {
      background: var(--primary);
    }

    @keyframes modalSlideUp {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Resplandores ambientales decorativos */
    .ambient-glow {
      position: absolute;
      width: 250px;
      height: 250px;
      border-radius: 50%;
      filter: blur(65px);
      pointer-events: none;
      z-index: 0;
      opacity: 0.35;
    }
    .glow-top-left {
      top: -80px;
      left: -80px;
      background: var(--primary-glow);
    }
    .glow-bottom-right {
      bottom: -80px;
      right: -80px;
      background: var(--secondary-glow);
    }

    /* Header */
    .zen-header {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.35rem;
    }

    .status-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
      justify-content: center;
      margin-bottom: 0.15rem;
    }

    .zen-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      background: var(--secondary-container);
      border: 1px solid var(--border-subtle);
      border-radius: 9999px;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--primary);
    }

    .zen-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--primary);
      box-shadow: 0 0 8px var(--primary);
      animation: pulseDot 2s infinite ease-in-out;
    }

    @keyframes pulseDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    .confidence-tag {
      font-size: 0.7rem;
      font-family: var(--font-mono, monospace);
      color: var(--text-muted);
      background: var(--bg-surface-low);
      border: 1px solid var(--border-subtle);
      padding: 0.22rem 0.55rem;
      border-radius: 6px;
    }

    .zen-title {
      font-size: clamp(1.2rem, 2.8vw, 1.55rem);
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.025em;
      margin: 0;
    }

    .zen-invitation {
      font-size: clamp(0.8rem, 1.8vw, 0.9rem);
      color: var(--text-secondary);
      line-height: 1.45;
      margin: 0;
      max-width: 480px;
    }

    /* ==========================================================================
       ETAPA DE RESPIRACIÓN Y MULTIMODALIDAD (ORBE ORGÁNICO)
       ========================================================================== */
    .multimodal-core {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.85rem;
      background: var(--bg-surface-low);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      padding: clamp(0.9rem, 2vw, 1.3rem) clamp(0.85rem, 2vw, 1.25rem);
    }

    .breathing-stage {
      position: relative;
      width: clamp(140px, 22vh, 175px);
      height: clamp(140px, 22vh, 175px);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0.15rem 0;
    }

    /* Halo pulsante con transición fluida */
    .halo-wave {
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
      filter: blur(12px);
      transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1), opacity 3s ease;
      transform: scale(0.9);
      opacity: 0.35;
    }

    .halo-wave.phase-inhale {
      transform: scale(1.3);
      opacity: 0.85;
      transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1), opacity 4s ease;
    }

    .halo-wave.phase-hold {
      transform: scale(1.3);
      opacity: 0.9;
      transition: none;
    }

    .halo-wave.phase-exhale {
      transform: scale(0.88);
      opacity: 0.25;
      transition: transform 8s cubic-bezier(0.4, 0, 0.2, 1), opacity 8s ease;
    }

    .halo-wave.paused {
      transition-play-state: paused !important;
    }

    /* Anillo concéntrico sutil */
    .orbit-ring {
      position: absolute;
      inset: 5px;
      border-radius: 50%;
      border: 1px dashed var(--border-subtle);
      opacity: 0.55;
      animation: rotateRing 45s linear infinite;
    }

    @keyframes rotateRing {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Orbe central biomimético */
    .breathing-sphere {
      position: relative;
      width: clamp(115px, 18vh, 145px);
      height: clamp(115px, 18vh, 145px);
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, var(--bg-surface-high) 0%, var(--bg-surface) 60%, var(--bg-surface-low) 100%);
      border: 2px solid var(--primary);
      box-shadow: 0 0 30px var(--primary-glow), inset 0 0 20px var(--secondary-glow);
      display: flex;
      align-items: center;
      justify-content: center;
      transform: scale(0.92);
      transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.8s ease, box-shadow 0.8s ease;
      cursor: default;
      user-select: none;
    }

    .breathing-sphere.phase-inhale {
      transform: scale(1.18);
      border-color: var(--primary);
      box-shadow: 0 0 40px var(--primary-glow), inset 0 0 22px var(--primary-glow);
      transition: transform 4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .breathing-sphere.phase-hold {
      transform: scale(1.18);
      border-color: var(--secondary-light);
      box-shadow: 0 0 45px var(--secondary-glow), inset 0 0 25px var(--secondary-glow);
      transition: none;
    }

    .breathing-sphere.phase-exhale {
      transform: scale(0.88);
      border-color: var(--border-subtle);
      box-shadow: 0 0 16px rgba(0, 0, 0, 0.2), inset 0 0 12px rgba(0, 0, 0, 0.1);
      transition: transform 8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .breathing-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .phase-tag {
      font-size: clamp(0.68rem, 1.6vw, 0.78rem);
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--primary);
      margin-bottom: 0.05rem;
    }

    .phase-countdown {
      font-size: clamp(1.4rem, 3.2vw, 1.85rem);
      font-weight: 800;
      font-family: var(--font-mono, monospace);
      color: var(--text-primary);
      line-height: 1;
      text-shadow: 0 0 10px var(--primary-glow);
    }

    .session-clock {
      font-size: clamp(0.72rem, 1.6vw, 0.82rem);
      font-family: var(--font-mono, monospace);
      font-weight: 600;
      color: var(--text-secondary);
      margin-top: 0.2rem;
    }

    .session-label {
      font-size: 0.58rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-top: 0.05rem;
    }

    .neuro-quote {
      font-size: clamp(0.74rem, 1.6vw, 0.82rem);
      color: var(--text-secondary);
      font-style: italic;
      text-align: center;
      margin: 0;
      max-width: 440px;
    }

    /* ==========================================================================
       BARRA DE SCAFFOLDING ACÚSTICA (VOICE COMPANION)
       ========================================================================== */
    .voice-controls-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.55rem 0.85rem;
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      gap: 0.65rem;
    }

    .voice-status {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
    }

    /* Ecualizador animado de 5 barras */
    .audio-waves {
      display: flex;
      align-items: center;
      gap: 3px;
      height: 18px;
      flex-shrink: 0;
    }

    .audio-waves .bar {
      width: 3px;
      height: 5px;
      background: var(--primary);
      border-radius: 2px;
      transition: height 0.2s ease;
    }

    .audio-waves.animating .bar-1 { animation: wavePulse 1s infinite ease-in-out; }
    .audio-waves.animating .bar-2 { animation: wavePulse 1s infinite ease-in-out 0.2s; }
    .audio-waves.animating .bar-3 { animation: wavePulse 1s infinite ease-in-out 0.4s; }
    .audio-waves.animating .bar-4 { animation: wavePulse 1s infinite ease-in-out 0.1s; }
    .audio-waves.animating .bar-5 { animation: wavePulse 1s infinite ease-in-out 0.3s; }

    @keyframes wavePulse {
      0%, 100% { height: 5px; }
      50% { height: 18px; }
    }

    .voice-text-group {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .voice-title {
      font-size: 0.73rem;
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .voice-indicator-text {
      font-size: 0.68rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-audio-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.38rem 0.8rem;
      background: var(--secondary-container);
      color: var(--primary);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease;
    }

    .btn-audio-toggle:hover {
      background: var(--primary-glow);
      border-color: var(--primary);
      transform: translateY(-1px);
    }

    .btn-audio-toggle:active {
      transform: scale(0.96);
    }

    /* ==========================================================================
       GRID DE CONTENIDO PEDAGÓGICO
       ========================================================================== */
    .zen-content-grid {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.85rem;
      width: 100%;
    }

    .zen-box {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 0.95rem;
      background: var(--bg-surface-low);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      transition: border-color 0.2s ease;
    }

    .zen-box:hover {
      border-color: var(--border-hover);
    }

    .mindfulness-box {
      border-left: 3px solid var(--primary);
    }

    .analogy-box {
      border-left: 3px solid var(--warning);
    }

    .box-icon {
      font-size: 1.3rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .box-body {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .box-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }

    .box-text {
      font-size: 0.74rem;
      color: var(--text-secondary);
      line-height: 1.45;
      margin: 0;
    }

    /* ==========================================================================
       ACCIONES INFERIORES / FOOTER RESPONSIVE
       ========================================================================== */
    .modal-footer-actions {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      width: 100%;
      margin-top: 0.1rem;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.65rem 1.15rem;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), background-color 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
    }

    .btn:active {
      transform: scale(0.97);
    }

    .btn-secondary {
      background: var(--bg-surface-low);
      color: var(--text-secondary);
      border: 1px solid var(--border-subtle);
      flex: 1;
      min-width: 150px;
    }

    .btn-secondary:hover {
      background: var(--bg-surface-high);
      color: var(--text-primary);
      border-color: var(--border-hover);
      transform: translateY(-1px);
    }

    .btn-extend {
      background: var(--secondary-container);
      color: var(--primary);
      border: 1px solid var(--border-subtle);
      flex: 0 1 auto;
      font-weight: 600;
    }

    .btn-extend:hover {
      background: var(--primary-glow);
      border-color: var(--primary);
      transform: translateY(-1px);
    }

    .btn-complete {
      background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
      color: var(--on-primary);
      box-shadow: 0 4px 16px var(--primary-glow);
      flex: 1;
      font-weight: 700;
      min-width: 170px;
    }

    .btn-complete:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 22px var(--primary-glow);
    }

    /* ==========================================================================
       MEDIA QUERIES RESPONSIVE (MOBILE & SHORT SCREENS)
       ========================================================================== */
    @media (max-width: 640px) {
      .zen-card {
        padding: 1.1rem 0.9rem;
        border-radius: 18px;
        gap: 0.85rem;
      }

      .zen-content-grid {
        grid-template-columns: 1fr;
        gap: 0.65rem;
      }

      .voice-controls-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 0.55rem;
      }

      .voice-actions {
        display: flex;
        justify-content: flex-end;
      }

      .btn-audio-toggle {
        width: 100%;
        justify-content: center;
      }

      .modal-footer-actions {
        flex-direction: column;
        gap: 0.55rem;
      }

      .btn {
        width: 100%;
      }
    }

    @media (max-height: 700px) {
      .modal-card.zen-card {
        padding: 0.85rem;
        gap: 0.65rem;
        max-height: 96vh;
      }

      .breathing-stage {
        width: 125px;
        height: 125px;
        margin: 0;
      }

      .breathing-sphere {
        width: 100px;
        height: 100px;
      }

      .phase-countdown {
        font-size: 1.25rem;
      }

      .zen-content-grid {
        gap: 0.45rem;
      }

      .zen-box {
        padding: 0.5rem 0.75rem;
      }

      .btn {
        padding: 0.55rem 0.9rem;
      }
    }
  `]
})
export class FatigueModalComponent implements OnDestroy {
  readonly voiceCompanion = inject(VoiceCompanionService);

  // Inputs
  readonly alert = input<EvaluationResult | null>(null);
  readonly intervention = input<CognitiveIntervention | null>(null);

  // Outputs
  readonly onDismiss = output<void>();
  readonly onResume = output<void>();

  // Estado reactivo del temporizador regresivo de 3 minutos (180 segundos)
  readonly remainingSeconds = signal<number>(180);
  readonly isTimerPaused = signal<boolean>(false);
  
  // Estado reactivo del ciclo de respiración 4-7-8
  readonly breathingPhase = signal<string>('Inhala');
  readonly phaseSecondsLeft = signal<number>(4);
  readonly phaseState = signal<'inhale' | 'hold' | 'exhale'>('inhale');

  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private breathPhaseInterval: ReturnType<typeof setInterval> | null = null;
  private hasAutoStarted = false;

  // Determina si el modal está abierto
  readonly isOpen = computed(() => {
    const alertData = this.alert();
    const directIntervention = this.intervention();
    return Boolean((alertData && alertData.fatigueDetected) || directIntervention);
  });

  // Intervención resuelta (directa, desde el alert o fallback integral)
  readonly activeIntervention = computed<CognitiveIntervention>(() => {
    const explicit = this.intervention();
    if (explicit) return explicit;

    const fromAlert = this.alert()?.intervention;
    if (fromAlert) return fromAlert;

    return {
      mindfulnessExercise: 'Inhala profundamente por la nariz en 4 segundos, retén el aire 7 segundos y exhala suavemente por la boca durante 8 segundos.',
      simplifiedAnalogy: 'Tu mente es como la memoria de un ordenador: tras procesar tareas intensas, un reinicio consciente de 3 minutos devuelve su máxima fluidez.',
      voiceScript: 'Hola. He notado que tu mente ha estado trabajando con intensidad. Aparta la mirada de la pantalla, relaja tus hombros y respira conmigo durante esta pausa restauradora. Despejemos tu concentración.',
      suggestedBreakMinutes: 3
    };
  });

  constructor() {
    // Reacciona cuando el modal se abre para iniciar el temporizador y la voz
    effect(() => {
      const open = this.isOpen();
      if (open) {
        if (!this.hasAutoStarted) {
          this.hasAutoStarted = true;
          this.startCountdownAndVoice();
        }
      } else {
        this.cleanup();
        this.hasAutoStarted = false;
      }
    });
  }

  /**
   * Cierra el modal si se pulsa fuera de la tarjeta
   */
  handleBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.skipBreak();
    }
  }

  /**
   * Inicializa el temporizador de 180 segundos y arranca el ciclo 4-7-8 con voz.
   */
  private startCountdownAndVoice(): void {
    const breakMinutes = this.activeIntervention().suggestedBreakMinutes || 3;
    const initialSeconds = breakMinutes * 60; // 180 segundos por defecto
    this.remainingSeconds.set(initialSeconds);
    this.isTimerPaused.set(false);

    // 1. Iniciar temporizador regresivo de 1 segundo
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      if (!this.isTimerPaused()) {
        const next = this.remainingSeconds() - 1;
        if (next <= 0) {
          this.remainingSeconds.set(0);
          this.clearTimer();
          this.voiceCompanion.stop();
        } else {
          this.remainingSeconds.set(next);
        }
      }
    }, 1000);

    // 2. Ciclo de guía respiratoria visual 4-7-8 (Inhala 4s -> Sostén 7s -> Exhala 8s = 19s total)
    let step = 0;
    this.breathingPhase.set('Inhala');
    this.phaseState.set('inhale');
    this.phaseSecondsLeft.set(4);

    this.clearBreathPhase();
    this.breathPhaseInterval = setInterval(() => {
      if (this.isTimerPaused()) return;

      step = (step + 1) % 19;
      if (step < 4) {
        this.breathingPhase.set('Inhala');
        this.phaseState.set('inhale');
        this.phaseSecondsLeft.set(4 - step);
      } else if (step < 11) {
        this.breathingPhase.set('Sostén');
        this.phaseState.set('hold');
        this.phaseSecondsLeft.set(11 - step);
      } else {
        this.breathingPhase.set('Exhala');
        this.phaseState.set('exhale');
        this.phaseSecondsLeft.set(19 - step);
      }
    }, 1000);

    // 3. Iniciar automáticamente la reproducción del voiceScript con Web Speech API
    const script = this.activeIntervention().voiceScript;
    if (script) {
      setTimeout(() => {
        this.voiceCompanion.speak(script);
      }, 400);
    }
  }

  /**
   * Extiende el descanso con segundos adicionales (por ejemplo +60s)
   */
  extendBreak(seconds: number = 60): void {
    this.remainingSeconds.update(current => current + seconds);
  }

  /**
   * Alterna la reproducción o pausa del guion de voz.
   */
  toggleVoice(): void {
    const script = this.activeIntervention().voiceScript;
    this.voiceCompanion.togglePlayPause(script);
  }

  /**
   * Salta la pausa activa de inmediato y reanuda la evaluación.
   */
  skipBreak(): void {
    this.cleanup();
    this.onDismiss.emit();
  }

  /**
   * Finaliza la pausa tras cumplirse el tiempo y continúa.
   */
  finishBreak(): void {
    this.cleanup();
    this.onResume.emit();
  }

  private clearTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private clearBreathPhase(): void {
    if (this.breathPhaseInterval !== null) {
      clearInterval(this.breathPhaseInterval);
      this.breathPhaseInterval = null;
    }
  }

  private cleanup(): void {
    this.clearTimer();
    this.clearBreathPhase();
    this.voiceCompanion.stop();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
