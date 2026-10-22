import { 
  Component, 
  OnInit, 
  AfterViewInit, 
  OnDestroy, 
  ElementRef, 
  ViewChild, 
  inject, 
  signal, 
  computed 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BiometricVisionService } from '../../core/services/biometric-vision.service';
import { VoiceCompanionService } from '../../core/services/voice-companion.service';
import { FatigueModalComponent } from '../../shared/components/fatigue-modal/fatigue-modal.component';
import { EvaluationResult } from '../../core/models/telemetry.model';

@Component({
  selector: 'app-biometrics',
  standalone: true,
  imports: [CommonModule, FatigueModalComponent],
  templateUrl: './biometrics.component.html',
  styleUrl: './biometrics.component.css'
})
export class BiometricsComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly visionService = inject(BiometricVisionService);
  readonly voiceService = inject(VoiceCompanionService);

  @ViewChild('webcamVideo') webcamVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('overlayCanvas') overlayCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pipVideo') pipVideoRef!: ElementRef<HTMLVideoElement>;

  readonly showZenModal = signal<boolean>(false);
  readonly autoStartCamera = signal<boolean>(true);

  // Modos de visualización con protagonismo de cámara ('studio' = cámara principal hero, 'split' = equilibrado, 'theater' = inmersivo)
  readonly viewMode = signal<'studio' | 'split' | 'theater'>('studio');
  readonly showHud = signal<boolean>(true);

  readonly isTheaterMode = computed(() => this.viewMode() === 'theater');

  setViewMode(mode: 'studio' | 'split' | 'theater'): void {
    this.viewMode.set(mode);
  }

  toggleTheater(): void {
    this.viewMode.update(m => m === 'theater' ? 'studio' : 'theater');
  }

  toggleHud(): void {
    this.showHud.update(v => !v);
  }

  // Formateadores reactivos
  readonly earDisplay = computed(() => this.visionService.currentEar().toFixed(3));
  readonly marDisplay = computed(() => this.visionService.currentMar().toFixed(3));
  readonly fatiguePercent = computed(() => Math.round(this.visionService.fatigueScore() * 100));

  readonly fatigueSeverityClass = computed(() => {
    const score = this.visionService.fatigueScore();
    if (score >= 0.80) return 'severity-critical';
    if (score >= 0.50) return 'severity-warning';
    return 'severity-optimal';
  });

  // Modal alert adapter
  readonly activeModalAlert = computed<EvaluationResult | null>(() => {
    if (!this.showZenModal() && this.visionService.fatigueScore() < 0.80) {
      return null;
    }
    const interv = this.visionService.lastIntervention();
    return {
      fatigueDetected: true,
      confidenceScore: this.visionService.fatigueScore(),
      status: this.visionService.fatigueStatus(),
      recommendation: this.visionService.lastRecommendation(),
      intervention: interv || {
        mindfulnessExercise: 'Inhala profundamente por la nariz en 4 segundos, sostén 4 segundos y exhala en 6 segundos.',
        simplifiedAnalogy: 'Tu mente es como la memoria RAM: cuando se satura de instrucciones, una pausa de 3 minutos restaura su máxima agilidad.',
        voiceScript: 'Hola. Es momento de hacer una pausa consciente. Aparta la mirada de la pantalla, relaja tus hombros y escucha a tu tutor de descanso.',
        suggestedBreakMinutes: 3
      }
    };
  });

  ngOnInit(): void {
    // Pedir permiso de notificaciones para soporte en segundo plano
    this.voiceService.requestNotificationPermission();
  }

  ngAfterViewInit(): void {
    if (this.webcamVideoRef && this.overlayCanvasRef) {
      this.visionService.bindElements(
        this.webcamVideoRef.nativeElement,
        this.overlayCanvasRef.nativeElement,
        this.pipVideoRef?.nativeElement
      );

      if (this.autoStartCamera()) {
        // Iniciar cámara automáticamente
        this.visionService.startCamera();
      }
    }
  }

  ngOnDestroy(): void {
    this.visionService.stopCamera();
    this.voiceService.stop();
  }

  toggleCamera(): void {
    if (this.visionService.isCameraActive()) {
      this.visionService.stopCamera();
    } else {
      this.visionService.startCamera();
    }
  }

  togglePip(): void {
    this.visionService.enablePictureInPicture();
  }

  openZenModal(): void {
    this.showZenModal.set(true);
    const script = this.visionService.lastIntervention()?.voiceScript ||
      'Inhala profundamente por la nariz, aparta la mirada de la pantalla y relaja los hombros.';
    this.voiceService.speak(script);
  }

  closeZenModal(): void {
    this.showZenModal.set(false);
    this.voiceService.stop();
  }

  playTestAudio(): void {
    this.voiceService.playAlertTone('critical');
  }

  speakCurrentIntervention(): void {
    const interv = this.visionService.lastIntervention();
    const text = interv?.voiceScript || this.visionService.lastRecommendation();
    this.voiceService.speak(text);
  }

  // Generador de path SVG para graficar series continuas en tiempo real
  generateSparklinePath(values: number[], min: number, max: number, width: number = 320, height: number = 60): string {
    if (!values || values.length === 0) return '';
    const range = max - min || 1;
    const stepX = width / (values.length - 1);

    const points = values.map((val, i) => {
      const clamped = Math.max(min, Math.min(max, val));
      const x = i * stepX;
      // Invertir Y (SVG 0 arriba, height abajo)
      const y = height - ((clamped - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }

  generateAreaPath(values: number[], min: number, max: number, width: number = 320, height: number = 60): string {
    const linePath = this.generateSparklinePath(values, min, max, width, height);
    if (!linePath) return '';
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  }
}
