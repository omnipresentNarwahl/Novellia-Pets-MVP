import { AgePipe, ageInMonths } from './age.pipe';

describe('AgePipe', () => {
  const pipe = new AgePipe();
  const ref = new Date(2026, 9, 6); // 6 Oct 2026

  it('shows years and months', () => {
    expect(pipe.transform('2023-08-06', ref)).toBe('3 years, 2 months');
  });

  it('drops the months when there are none', () => {
    expect(pipe.transform('2024-10-06', ref)).toBe('2 years');
    expect(pipe.transform('2025-10-06', ref)).toBe('1 year');
  });

  it('shows only months under a year, using the singular for one', () => {
    expect(pipe.transform('2026-05-06', ref)).toBe('5 months');
    expect(pipe.transform('2026-09-06', ref)).toBe('1 month');
  });

  it('does not count a month until the day of the month is reached', () => {
    expect(pipe.transform('2026-09-07', ref)).toBe('Under 1 month');
    expect(pipe.transform('2024-10-07', ref)).toBe('1 year, 11 months');
  });

  it('handles a birthday today and a pet born today', () => {
    expect(pipe.transform('2020-10-06', ref)).toBe('6 years');
    expect(pipe.transform('2026-10-06', ref)).toBe('Under 1 month');
  });

  it('says the age is unknown without a birth date', () => {
    expect(pipe.transform(null, ref)).toBe('Age unknown');
    expect(pipe.transform(undefined, ref)).toBe('Age unknown');
    expect(pipe.transform('', ref)).toBe('Age unknown');
  });

  it('never goes negative', () => {
    expect(ageInMonths(new Date(2027, 0, 1), ref)).toBe(0);
  });
});
