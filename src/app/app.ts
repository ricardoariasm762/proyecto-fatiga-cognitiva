import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BiometricVisionService } from './core/services/biometric-vision.service';
import { ThemeService } from './core/services/theme.service';

/**
 * Shell Principal de la Aplicación NeuroEdu:
 * Provee la Navbar con telemetría biométrica continua, controles PiP,
 * cambio dinámico de tema Claro/Oscuro y contenedor de vistas.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly visionService = inject(BiometricVisionService);
  readonly themeService = inject(ThemeService);

  readonly isSidebarOpen = signal<boolean>(true);
  readonly showInspector = signal<boolean>(false);

  toggleSidebar(): void {
    this.isSidebarOpen.update(v => !v);
  }

  toggleInspector(): void {
    this.showInspector.update(v => !v);
  }

  toggleSimulation(): void {
    this.visionService.toggleSimulation();
  }

  togglePip(): void {
    this.visionService.enablePictureInPicture();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
