import { Pipe, PipeTransform } from '@angular/core';
import { parseIsoDate } from '../core/dates';

/** Whole months between a birth date and a reference date. */
export function ageInMonths(dateOfBirth: Date, reference: Date): number {
  let months =
    (reference.getFullYear() - dateOfBirth.getFullYear()) * 12 + (reference.getMonth() - dateOfBirth.getMonth());
  if (reference.getDate() < dateOfBirth.getDate()) {
    months--;
  }
  return Math.max(0, months);
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/** "3 years, 2 months", "5 months", "Under 1 month", or "Age unknown" when there is no birth date. */
@Pipe({ name: 'age' })
export class AgePipe implements PipeTransform {
  transform(dateOfBirth: string | null | undefined, reference: Date = new Date()): string {
    if (!dateOfBirth) {
      return 'Age unknown';
    }
    const total = ageInMonths(parseIsoDate(dateOfBirth), reference);
    if (total < 1) {
      return 'Under 1 month';
    }
    const years = Math.floor(total / 12);
    const months = total % 12;
    if (years === 0) {
      return plural(months, 'month');
    }
    return months === 0 ? plural(years, 'year') : `${plural(years, 'year')}, ${plural(months, 'month')}`;
  }
}
