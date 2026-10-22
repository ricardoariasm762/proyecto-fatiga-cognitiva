import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe que formatea una cantidad de segundos numéricos en formato mm:ss.
 * Ejemplo: 65 -> "01:05", 300 -> "05:00"
 */
@Pipe({
  name: 'timeFormat',
  standalone: true
})
export class TimeFormatPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null || isNaN(value)) {
      return '00:00';
    }

    const totalSeconds = Math.max(0, Math.floor(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
  }
}
