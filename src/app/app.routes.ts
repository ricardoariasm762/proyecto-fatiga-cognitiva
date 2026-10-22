import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'biometria',
    pathMatch: 'full'
  },
  {
    path: 'biometria',
    loadComponent: () => import('./features/biometrics/biometrics.component').then(m => m.BiometricsComponent),
    title: 'Monitoreo Biométrico en Tiempo Real | NeuroEdu'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
    title: 'Dashboard de Telemetría | NeuroEdu'
  },
  {
    path: 'historial',
    loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
    title: 'Historial de Sesión | NeuroEdu'
  },
  {
    path: 'evaluacion',
    loadComponent: () => import('./features/quiz/quiz.component').then(m => m.QuizComponent),
    title: 'Evaluación Interactiva & Telemetría | NeuroEdu'
  },
  {
    path: '**',
    redirectTo: 'biometria'
  }
];
