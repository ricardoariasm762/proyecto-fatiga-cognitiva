import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TelemetryService } from '../../core/services/telemetry.service';
import { TelemetryLogEntry, StudentInteractionDto } from '../../core/models/telemetry.model';
import { StatBadgeComponent } from '../../shared/components/stat-badge/stat-badge.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, StatBadgeComponent],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnInit {
  protected readonly Math = Math;
  readonly telemetryService = inject(TelemetryService);
  private readonly router = inject(Router);

  readonly dbInteractions = signal<StudentInteractionDto[]>([]);
  readonly isLoadingDb = signal<boolean>(false);
  readonly activeTab = signal<'sesion' | 'graficas' | 'json'>('sesion');

  // Registros en memoria de la sesión activa
  readonly logs = computed(() => this.telemetryService.sessionHistory());

  // Métricas agregadas
  readonly totalAttempts = computed(() => this.logs().length);
  
  readonly correctCount = computed(() => 
    this.logs().filter(l => l.payload.isCorrect).length
  );

  readonly accuracyPercent = computed(() => {
    const total = this.totalAttempts();
    if (total === 0) return 0;
    return Math.round((this.correctCount() / total) * 100);
  });

  readonly averageResponseTime = computed(() => {
    const list = this.logs();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, curr) => acc + curr.payload.responseTimeSeconds, 0);
    return parseFloat((sum / list.length).toFixed(1));
  });

  readonly averageInactivityTime = computed(() => {
    const list = this.logs();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, curr) => acc + curr.payload.inactivitySeconds, 0);
    return parseFloat((sum / list.length).toFixed(1));
  });

  readonly fatigueEpisodesCount = computed(() => 
    this.logs().filter(l => l.result.fatigueDetected).length
  );

  // Máximo tiempo de respuesta para escalar las barras de la gráfica
  readonly maxResponseTime = computed(() => {
    const list = this.logs();
    if (list.length === 0) return 100;
    const max = Math.max(...list.map(l => l.payload.responseTimeSeconds));
    return Math.max(80, Math.ceil(max * 1.15));
  });

  ngOnInit(): void {
    this.syncWithBackendDatabase();
  }

  syncWithBackendDatabase(): void {
    const sessionId = this.telemetryService.sessionId();
    if (!sessionId) return;

    this.isLoadingDb.set(true);
    this.telemetryService.fetchSessionHistory(sessionId).subscribe({
      next: (data) => {
        this.dbInteractions.set(data);
        this.isLoadingDb.set(false);
      },
      error: () => {
        this.isLoadingDb.set(false);
      }
    });
  }

  exportJsonReport(): void {
    const reportData = {
      studentId: this.telemetryService.studentId(),
      sessionId: this.telemetryService.sessionId(),
      exportedAt: new Date().toISOString(),
      summary: {
        totalExercises: this.totalAttempts(),
        correctAnswers: this.correctCount(),
        accuracyPercentage: this.accuracyPercent(),
        averageResponseTimeSeconds: this.averageResponseTime(),
        averageInactivitySeconds: this.averageInactivityTime(),
        fatigueEpisodesDetected: this.fatigueEpisodesCount()
      },
      interactions: this.logs()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-fatiga-${this.telemetryService.studentId()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  goToEvaluation(): void {
    this.router.navigate(['/evaluacion']);
  }
}
