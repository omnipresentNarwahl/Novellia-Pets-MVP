import { parseIsoDate, toIsoDate } from '../../core/dates';
import { DailySteps } from '../../models/steps';

export type StepRange = 'month' | 'quarter' | 'year';
export type StepUnit = 'day' | 'week' | 'month';

export const STEP_RANGES: readonly {
  value: StepRange;
  label: string;
  unit: StepUnit;
  caption: string;
  /** How the range reads after "average over the". */
  period: string;
}[] = [
  { value: 'month', label: 'Month', unit: 'day', caption: 'Last 30 days, steps per day', period: 'last 30 days' },
  {
    value: 'quarter',
    label: '3 months',
    unit: 'week',
    caption: 'Last 13 weeks, average steps per day',
    period: 'last 13 weeks',
  },
  {
    value: 'year',
    label: 'Year',
    unit: 'month',
    caption: 'Last 12 months, average steps per day',
    period: 'last 12 months',
  },
];

/** One column of the chart: a day, a week (Monday to Sunday) or a calendar month. */
export interface StepColumn {
  /** First and last day covered, yyyy-MM-dd. */
  start: string;
  end: string;
  /** The day's total, or for weeks and months the average per day. */
  steps: number;
  /** The newest column, which is still in progress. */
  partial: boolean;
}

/**
 * Groups daily totals into the columns for a range, oldest first. The newest day in `days` counts as today.
 * Week and month columns show the average per day, so a period that is only partly covered (the current one,
 * or the oldest one in the data) is not drawn artificially short; today is left out of that average while
 * the period has complete days. Periods without any data are left out.
 */
export function stepColumns(days: DailySteps[], range: StepRange): StepColumn[] {
  if (days.length === 0) {
    return [];
  }
  const today = parseIsoDate(days[days.length - 1].date);

  if (range === 'month') {
    const first = toIsoDate(addDays(today, -29));
    return days
      .filter((d) => d.date >= first)
      .map((d) => ({ start: d.date, end: d.date, steps: d.steps, partial: d.partial }));
  }

  const periods: [Date, Date][] = [];
  if (range === 'quarter') {
    const monday = addDays(today, -((today.getDay() + 6) % 7));
    for (let w = 12; w >= 0; w--) {
      const start = addDays(monday, -7 * w);
      periods.push([start, addDays(start, 6)]);
    }
  } else {
    for (let m = 11; m >= 0; m--) {
      periods.push([
        new Date(today.getFullYear(), today.getMonth() - m, 1),
        new Date(today.getFullYear(), today.getMonth() - m + 1, 0),
      ]);
    }
  }

  return periods.flatMap(([startDate, endDate], i) => {
    const start = toIsoDate(startDate);
    const end = toIsoDate(endDate);
    const inPeriod = days.filter((d) => d.date >= start && d.date <= end);
    if (inPeriod.length === 0) {
      return [];
    }
    const complete = inPeriod.filter((d) => !d.partial);
    const counted = complete.length > 0 ? complete : inPeriod;
    const average = Math.round(counted.reduce((sum, d) => sum + d.steps, 0) / counted.length);
    return [{ start, end, steps: average, partial: i === periods.length - 1 }];
  });
}

/**
 * Mean steps per day over the whole period the chart shows for `range`. Today is still in progress, so it is
 * left out (unless it is the only day). Null when there is no data.
 */
export function rangeAverage(days: DailySteps[], range: StepRange): number | null {
  const columns = stepColumns(days, range);
  if (columns.length === 0) {
    return null;
  }
  const inRange = days.filter((d) => d.date >= columns[0].start);
  const complete = inRange.filter((d) => !d.partial);
  const counted = complete.length > 0 ? complete : inRange;
  return Math.round(counted.reduce((sum, d) => sum + d.steps, 0) / counted.length);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
