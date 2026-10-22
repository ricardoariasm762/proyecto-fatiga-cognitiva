import { Injectable, signal, computed } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'neuroedu-theme';

  readonly theme = signal<ThemeMode>('dark');
  readonly hasManualOverride = signal<boolean>(false);
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      this.hasManualOverride.set(true);
      this.applyTheme(saved);
    } else {
      // Detección automática según preferencia del sistema operativo
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.hasManualOverride.set(false);
      this.applyTheme(prefersDark ? 'dark' : 'light');
    }

    // Escuchar cambios de preferencia del sistema si el usuario no tiene override manual
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (!this.hasManualOverride()) {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  }

  toggleTheme(): void {
    const nextTheme: ThemeMode = this.theme() === 'dark' ? 'light' : 'dark';
    this.hasManualOverride.set(true);
    localStorage.setItem(this.STORAGE_KEY, nextTheme);
    this.applyTheme(nextTheme);
  }

  setTheme(mode: ThemeMode): void {
    this.hasManualOverride.set(true);
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.applyTheme(mode);
  }

  resetToSystemPreference(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.hasManualOverride.set(false);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(prefersDark ? 'dark' : 'light');
  }

  private applyTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', mode);
      root.classList.remove('dark', 'light');
      root.classList.add(mode);
      
      // Actualizar meta theme-color para navegadores móviles/escritorio
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', mode === 'dark' ? '#0b0f12' : '#f2f7f5');
      }
    }
  }
}
