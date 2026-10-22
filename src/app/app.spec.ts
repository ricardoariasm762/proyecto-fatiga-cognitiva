import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { TelemetryService } from './core/services/telemetry.service';
import { TimerService } from './core/services/timer.service';
import { TimeFormatPipe } from './shared/pipes/time-format.pipe';
import { QuizComponent } from './features/quiz/quiz.component';
import { FatigueModalComponent } from './shared/components/fatigue-modal/fatigue-modal.component';
import { VoiceCompanionService } from './core/services/voice-companion.service';

describe('Frontend Modular Architecture Tests', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, QuizComponent, FatigueModalComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        TelemetryService,
        TimerService,
        VoiceCompanionService
      ]
    }).compileComponents();
  });

  it('should create the App shell component', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(app.isSidebarOpen()).toBe(true);
  });

  it('should toggle sidebar and inspector in App shell', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.toggleSidebar();
    expect(app.isSidebarOpen()).toBe(false);
    app.toggleInspector();
    expect(app.showInspector()).toBe(true);
  });

  it('should initialize QuizComponent with first question and timer', () => {
    const fixture = TestBed.createComponent(QuizComponent);
    const quiz = fixture.componentInstance;
    expect(quiz).toBeTruthy();
    expect(quiz.currentIndex()).toBe(0);
    expect(quiz.currentQuestion().id).toBe(1);
    expect(quiz.totalQuestions()).toBe(8);
  });

  it('should select an option and record user interaction in QuizComponent', () => {
    const fixture = TestBed.createComponent(QuizComponent);
    const quiz = fixture.componentInstance;
    quiz.selectOption(1);
    expect(quiz.selectedOption()).toBe(1);
  });

  it('should format seconds properly with TimeFormatPipe', () => {
    const pipe = new TimeFormatPipe();
    expect(pipe.transform(0)).toBe('00:00');
    expect(pipe.transform(65)).toBe('01:05');
    expect(pipe.transform(180)).toBe('03:00');
    expect(pipe.transform(300)).toBe('05:00');
  });

  it('should initialize VoiceCompanionService with proper reactive signals', () => {
    const voiceService = TestBed.inject(VoiceCompanionService);
    expect(voiceService).toBeTruthy();
    expect(voiceService.isSpeaking()).toBe(false);
    expect(voiceService.isPaused()).toBe(false);
    expect(typeof voiceService.isSupported()).toBe('boolean');
  });

  it('should create FatigueModalComponent and resolve active intervention', () => {
    const fixture = TestBed.createComponent(FatigueModalComponent);
    const modal = fixture.componentInstance;
    expect(modal).toBeTruthy();
    expect(modal.remainingSeconds()).toBe(180);
    expect(modal.breathingPhase()).toBe('Inhala');

    const intervention = modal.activeIntervention();
    expect(intervention).toBeTruthy();
    expect(intervention.suggestedBreakMinutes).toBe(3);
    expect(intervention.voiceScript.length).toBeGreaterThan(15);
  });
});

