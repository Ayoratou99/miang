import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a money amount as `240 000 F` (FCFA has no minor unit — integers only).
 * Pass `false` to drop the « F » suffix.
 */
@Pipe({ name: 'fcfa' })
export class FcfaPipe implements PipeTransform {
  transform(value: number | string | null | undefined, avecDevise = true): string {
    const n = typeof value === 'string' ? Number(value) : (value ?? 0);
    if (Number.isNaN(n)) {
      return '—';
    }
    // fr-FR groups thousands with narrow/no-break spaces; \s normalizes to a plain space.
    const formatted = Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ');
    return avecDevise ? `${formatted} F` : formatted;
  }
}
