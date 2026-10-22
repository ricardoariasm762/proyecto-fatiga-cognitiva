# NeuroEdu Vision — Detector Biométrico de Fatiga Cognitiva en Tiempo Real

Plataforma web de monitoreo biométrico en tiempo real y asistencia pedagógica diseñada para detectar la fatiga cognitiva, microsueños y pérdida de atención en estudiantes mediante visión por computador y análisis de hitos faciales (MediaPipe Face Mesh).

---

## 🌟 Características Principales

### 1. Telemetría y Visión Biométrica en Tiempo Real (Edge Computing)
- **Inferencia 100% On-Device**: Análisis de 468 puntos faciales en el navegador sin enviar fotogramas de video a servidores externos.
- **Eye Aspect Ratio (EAR)**: Detección precisa de parpadeos y cálculo continuo del umbral de cierre ocular.
- **Mouth Aspect Ratio (MAR)**: Detección y cuantificación de bostezos en tiempo real.
- **Arquitectura Multihilo con Web Worker**: El procesamiento matemático de hitos y la estimación de fatiga se ejecutan en un hilo secundario (`biometric.worker.ts`), manteniendo la interfaz a 60 FPS estables.
- **Modos de Visualización**:
  - **Estudio (Hero Camera)**: La cámara principal en el centro con HUD de telemetría y sparklines reactivos.
  - **Dividida**: Vista balanceada entre cámara e instrumental de telemetría.
  - **Teatro**: Pantalla completa inmersiva con controles flotantes.
- **Picture-in-Picture (PiP)**: Transmisión continua de la cámara y estado biométrico al cambiar de pestaña.

### 2. Sistema de Diseño Ethereal Biomimetic (Stitch with Google)
- **Paleta de Colores Curada**:
  - *Bioluminescent Mint* (`#00F5D4`): Acento principal y estados óptimos.
  - *Muted Sage* (`#7FA99B`): Fondos celulares y auras de contención.
  - *Coral Amber* (`#FF6B6B`): Indicadores de fatiga crítica y advertencias.
  - *Obsidian Void* (`#0B0F12`): Fondo base de baja fototensión en modo oscuro.
- **Modos Claro y Oscuro**:
  - Detección automática del esquema preferido del sistema operativo (`prefers-color-scheme`).
  - Interruptor manual en la barra de navegación con micro-animaciones fluidas.
  - Biomembranas translúcidas con desenfoque de fondo (`backdrop-filter: blur(20px)`).

### 3. Pausa Zen 4-7-8 (Protocolo de Descompresión Ocular & Mental)
- **Ciclo Respiratorio 4-7-8 Guiado**:
  - **Inhala (4s)**: Expansión suave del orbe bioluminiscente.
  - **Sostén (7s)**: Retención consciente en calma con aura bio-óptica.
  - **Exhala (8s)**: Contracción relajante para liberar tensión ciliar.
- **Acompañante de Voz Multimodal**:
  - Síntesis de voz con Web Speech API narrando inducciones guiadas.
  - Ecualizador de audio animado de 5 barras reactivas.
  - Botón interactivo para extender la calma (`+1 Minuto de Calma`).
- **Diseño 100% Responsive**: Ajuste seguro con `clamp()` y contención vertical en móviles y pantallas pequeñas.

### 4. Evaluación Cognitiva y Analítica
- Módulo de evaluación interactiva con preguntas de diversas categorías cognitivas.
- Panel analítico con gráficas de evolución temporal (fatiga, tasa de parpadeo y tiempo de respuesta).

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: Angular 19+ (Standalone Components, Zoneless Change Detection con Signals)
- **Estilos**: Vanilla CSS con Custom Properties (`tokens`) y Glassmorphism
- **Visión por Computador**: MediaPipe Face Mesh & Canvas API
- **Concurrencia**: HTML5 Web Workers
- **Audio & Voz**: Web Speech API & Web Audio API
- **Pruebas**: Vitest & Angular TestBed

---

## 🚀 Puesta en Marcha

### Prerrequisitos
- Node.js (versión 18 o superior)
- npm (versión 9 o superior)

### Instalación de dependencias
```bash
npm install
```

### Ejecutar servidor de desarrollo
```bash
npm run dev
# o alternativamente:
ng serve
```
Abre tu navegador en `http://localhost:4200/`.

### Ejecutar pruebas unitarias
```bash
npm test
```

### Compilar para producción
```bash
npm run build
```
Los artefactos compilados y optimizados se generarán en la carpeta `dist/`.
