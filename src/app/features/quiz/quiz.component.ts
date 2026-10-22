import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TelemetryService } from '../../core/services/telemetry.service';
import { TimerService } from '../../core/services/timer.service';
import { DEFAULT_QUESTIONS, ExerciseQuestion } from '../../core/models/question.model';
import { EvaluationPayload, EvaluationResult } from '../../core/models/telemetry.model';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { StatBadgeComponent } from '../../shared/components/stat-badge/stat-badge.component';
import { FatigueModalComponent } from '../../shared/components/fatigue-modal/fatigue-modal.component';
import { TimeFormatPipe } from '../../shared/pipes/time-format.pipe';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    CommonModule, 
    ProgressBarComponent, 
    FatigueModalComponent
  ],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent implements OnInit, OnDestroy {
  readonly telemetryService = inject(TelemetryService);
  readonly timerService = inject(TimerService);
  private readonly router = inject(Router);

  // ==========================================
  // ESTADO REACTIVO DEL CUESTIONARIO
  // ==========================================
  readonly questions = signal<ExerciseQuestion[]>(DEFAULT_QUESTIONS);
  readonly currentIndex = signal<number>(0);
  readonly selectedOption = signal<number | null>(null);
  readonly isEvaluating = signal<boolean>(false);
  readonly activeFatigueAlert = signal<EvaluationResult | null>(null);
  readonly isQuizFinished = signal<boolean>(false);

  // Signals derivados
  readonly currentQuestion = computed(() => this.questions()[this.currentIndex()]);
  readonly totalQuestions = computed(() => this.questions().length);

  readonly correctCount = computed(() => 
    this.telemetryService.sessionHistory().filter(h => h.payload.isCorrect).length
  );

  readonly accuracyPercent = computed(() => {
    const total = this.telemetryService.sessionHistory().length;
    if (total === 0) return 0;
    return Math.round((this.correctCount() / total) * 100);
  });

  ngOnInit(): void {
    this.startCurrentQuestion();
  }

  ngOnDestroy(): void {
    this.timerService.reset();
  }

  private startCurrentQuestion(): void {
    this.selectedOption.set(null);
    this.timerService.start();
  }

  selectOption(index: number): void {
    if (this.isEvaluating() || this.activeFatigueAlert() !== null) return;
    this.timerService.recordManualInteraction();
    this.selectedOption.set(index);
  }

  submitAnswer(): void {
    const selected = this.selectedOption();
    if (selected === null || this.isEvaluating() || this.activeFatigueAlert() !== null) return;

    // 1. Detener cronómetro y capturar métricas exactas
    const metrics = this.timerService.stop();
    const question = this.currentQuestion();
    const isCorrect = (selected === question.correctOptionIndex);

    // 2. Construir payload para el backend Spring Boot
    const payload: EvaluationPayload = {
      studentId: this.telemetryService.studentId(),
      sessionId: this.telemetryService.sessionId(),
      exerciseIndex: this.currentIndex() + 1,
      responseTimeSeconds: metrics.responseTimeSeconds,
      isCorrect,
      inactivitySeconds: metrics.inactivitySeconds
    };

    this.isEvaluating.set(true);

    // 3. Envío al servicio de telemetría e inferencia ONNX
    this.telemetryService.evaluateInteraction(payload).subscribe({
      next: (result: EvaluationResult) => {
        this.isEvaluating.set(false);

        if (result.fatigueDetected) {
          // Congelar la prueba y desplegar el banner/modal preventivo
          this.activeFatigueAlert.set(result);
        } else {
          this.advanceToNext();
        }
      },
      error: () => {
        this.isEvaluating.set(false);
        this.advanceToNext();
      }
    });
  }

  private advanceToNext(): void {
    if (this.currentIndex() + 1 < this.totalQuestions()) {
      this.currentIndex.update(idx => idx + 1);
      this.startCurrentQuestion();
    } else {
      this.isQuizFinished.set(true);
      this.timerService.reset();
    }
  }

  onDismissAlert(): void {
    this.activeFatigueAlert.set(null);
    this.advanceToNext();
  }

  onResumeFromBreak(): void {
    this.activeFatigueAlert.set(null);
    this.advanceToNext();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  restartQuiz(): void {
    this.telemetryService.resetSession();
    this.currentIndex.set(0);
    this.isQuizFinished.set(false);
    this.activeFatigueAlert.set(null);
    this.startCurrentQuestion();
  }
}
