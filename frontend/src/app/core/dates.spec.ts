import { parseIsoDate, toIsoDate, today } from './dates';

describe('dates', () => {
  it('formats a date from its local year, month and day', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('keeps the picked day even late in the evening, where toISOString could move it', () => {
    // 23:30 local on the 6th: in any timezone east of UTC, toISOString would already say the 5th or 7th.
    expect(toIsoDate(new Date(2026, 9, 6, 23, 30))).toBe('2026-10-06');
    expect(toIsoDate(new Date(2026, 9, 6, 0, 15))).toBe('2026-10-06');
  });

  it('round-trips through parseIsoDate as a local calendar date', () => {
    const parsed = parseIsoDate('2024-02-29');
    expect([parsed.getFullYear(), parsed.getMonth(), parsed.getDate()]).toEqual([2024, 1, 29]);
    expect(toIsoDate(parsed)).toBe('2024-02-29');
  });

  it('gives today at local midnight', () => {
    const t = today();
    expect([t.getHours(), t.getMinutes(), t.getSeconds()]).toEqual([0, 0, 0]);
    expect(toIsoDate(t)).toBe(toIsoDate(new Date()));
  });
});
