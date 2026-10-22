import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="stat-badge" [class]="badgeClass()">
      <span class="dot"></span>
      <span class="label">{{ displayLabel() }}</span>
    </span>
  `,
  styles: [`
    .stat-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      transition: all 0.2s ease;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
    }

    /* Estado Óptimo / Éxito */
    .badge-optimo {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    /* Estado Alerta / Precaución */
    .badge-alerta {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    /* Estado Fatiga / Peligro */
    .badge-fatiga {
      background: rgba(244, 63, 94, 0.15);
      color: #fda4af;
      border: 1px solid rgba(244, 63, 94, 0.35);
      box-shadow: 0 0 10px rgba(244, 63, 94, 0.2);
    }

    /* Estado Neutral */
    .badge-neutral {
      background: rgba(255, 255, 255, 0.06);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  `]
})
export class StatBadgeComponent {
  readonly status = input.required<string>();

  readonly badgeClass = computed(() => {
    const s = this.status().toUpperCase();
    if (s.includes('FATIGA') || s === 'INCORRECTO' || s === 'FALLO') {
      return 'badge-fatiga';
    }
    if (s.includes('ALERTA') || s.includes('OFFLINE') || s.includes('PENDIENTE')) {
      return 'badge-alerta';
    }
    if (s.includes('OPTIMA') || s.includes('ÓPTIMO') || s === 'CORRECTO' || s === 'ONLINE') {
      return 'badge-optimo';
    }
    return 'badge-neutral';
  });

  readonly displayLabel = computed(() => {
    const s = this.status();
    if (s === 'FATIGA_COGNITIVA_ACTIVA') return 'Fatiga Cognitiva Activa';
    if (s === 'ATENCION_OPTIMA') return 'Atención Óptima';
    return s;
  });
}
