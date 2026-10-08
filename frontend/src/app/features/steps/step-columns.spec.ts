import { DailySteps } from '../../models/steps';
import { rangeAverage, stepColumns } from './step-columns';

/** Daily totals for every day from `from` to `to` (inclusive), with the last one partial. */
function days(from: string, to: string, steps: (date: Date) => number): DailySteps[] {
  const result: DailySteps[] = [];
  const [fy, fm, fd] = from.split('-').map(Number);
  for (let d = new Date(fy, fm - 1, fd); ; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    result.push({ date, steps: steps(d), partial: false });
    if (date === to) {
      break;
    }
  }
  result[result.length - 1].partial = true;
  return result;
}

describe('stepColumns', () => {
  // Wednesday 7 October 2026 is "today".
  const year = days('2025-10-07', '2026-10-07', (d) => d.getMonth() * 1000 + d.getDate());

  it('gives the last 30 days for a month, ending with today', () => {
    const columns = stepColumns(year, 'month');
    expect(columns).toHaveLength(30);
    expect(columns[0].start).toBe('2026-09-08');
    expect(columns[29]).toEqual({ start: '2026-10-07', end: '2026-10-07', steps: 9007, partial: true });
  });

  it('gives 13 Monday-to-Sunday weeks for 3 months, averaging complete days', () => {
    const columns = stepColumns(year, 'quarter');
    expect(columns).toHaveLength(13);
    expect(columns[0]).toMatchObject({ start: '2026-07-13', end: '2026-07-19', partial: false });
    expect(columns[0].steps).toBe(6000 + 16); // July 13-19 average to the 16th
    // This week so far is Monday 5 and Tuesday 6; today (the 7th) is left out of the average.
    expect(columns[12]).toEqual({ start: '2026-10-05', end: '2026-10-11', steps: 9000 + 6, partial: true });
  });

  it('gives 12 calendar months for a year', () => {
    const columns = stepColumns(year, 'year');
    expect(columns.map((c) => c.start)).toEqual([
      '2025-11-01', '2025-12-01', '2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01',
      '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01',
    ]);
    expect(columns[3]).toMatchObject({ end: '2026-02-28', steps: 1000 + 15 }); // Feb 1-28 average to 14.5
    expect(columns[11].partial).toBe(true);
  });

  it('uses today on its own when a period has nothing else yet, and leaves out periods without data', () => {
    const fresh = days('2026-10-05', '2026-10-05', () => 700);
    expect(stepColumns(fresh, 'quarter')).toEqual([{ start: '2026-10-05', end: '2026-10-11', steps: 700, partial: true }]);
    expect(stepColumns(fresh, 'year')).toHaveLength(1);
    expect(stepColumns([], 'year')).toEqual([]);
  });
});

describe('rangeAverage', () => {
  it('averages every complete day the range covers, leaving out today', () => {
    // 1,000 a day for the 29 days before today, and a partial today that would drag the average down.
    const month = days('2026-09-08', '2026-10-07', (d) => (d.getDate() === 7 && d.getMonth() === 9 ? 10 : 1000));
    expect(rangeAverage(month, 'month')).toBe(1000);
  });

  it('covers from the start of the first column, so 3 months starts on a Monday', () => {
    const year = days('2025-10-07', '2026-10-07', (d) => (d < new Date(2026, 6, 13) ? 0 : 700));
    expect(rangeAverage(year, 'quarter')).toBe(700); // July 13 onwards
    expect(rangeAverage(year, 'year')).toBeLessThan(700);
  });

  it('is null without data', () => {
    expect(rangeAverage([], 'year')).toBeNull();
  });
});
