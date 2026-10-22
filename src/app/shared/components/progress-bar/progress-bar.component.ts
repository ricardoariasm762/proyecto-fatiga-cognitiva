import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="progress-wrapper">
      <div class="progress-header">
        <div class="step-info">
          <span class="step-counter">Pregunta {{ current() }} de {{ total() }}</span>
          @if (category()) {
            <span class="category-chip">{{ category() }}</span>
          }
          @if (difficulty()) {
            <span class="difficulty-chip" [class]="'diff-' + difficulty()?.toLowerCase()">
              {{ difficulty() }}
            </span>
          }
        </div>
        <span class="percentage-label">{{ percentage() }}% completado</span>
      </div>

      <div class="track" role="progressbar" [attr.aria-valuenow]="percentage()" aria-valuemin="0" aria-valuemax="100">
        <div class="fill" [style.width.%]="percentage()"></div>
      </div>
    </div>
  `,
  styles: [`
    .progress-wrapper {
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      width: 100%;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .step-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .step-counter {
      font-weight: 700;
      font-size: 0.95rem;
      color: #fff;
    }

    .category-chip {
      font-size: 0.78rem;
      color: var(--text-secondary, #94a3b8);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
    }

    .difficulty-chip {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
    }

    .diff-básico, .diff-basico {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
    }

    .diff-intermedio {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
    }

    .diff-avanzado {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
    }

    .percentage-label {
      font-size: 0.8rem;
      color: var(--text-muted, #64748b);
      font-weight: 600;
      font-family: var(--font-mono, monospace);
    }

    .track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 9999px;
      overflow: hidden;
    }

    .fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1 0%, #06b6d4 100%);
      border-radius: 9999px;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
    }
  `]
})
export class ProgressBarComponent {
  readonly current = input.required<number>();
  readonly total = input.required<number>();
  readonly category = input<string>();
  readonly difficulty = input<string>();

  readonly percentage = computed(() => {
    const tot = this.total();
    if (tot === 0) return 0;
    return Math.min(100, Math.round((this.current() / tot) * 100));
  });
}
