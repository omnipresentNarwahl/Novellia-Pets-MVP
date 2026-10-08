import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepProfileSlot } from '../../models/steps';
import { StepProfileChart, timeLabel } from './step-profile-chart';

describe('timeLabel', () => {
  it('formats minutes after midnight as a 12-hour time', () => {
    expect(timeLabel(0)).toBe('12 AM');
    expect(timeLabel(15 * 60)).toBe('3 PM');
    expect(timeLabel(14 * 60 + 30, true)).toBe('2:30 PM');
    expect(timeLabel(24 * 60)).toBe('12 AM');
  });
});

describe('StepProfileChart', () => {
  let fixture: ComponentFixture<StepProfileChart>;

  // Busy at 2:30 PM (slot 87), quiet otherwise.
  const slots: StepProfileSlot[] = Array.from({ length: 144 }, (_, i) =>
    i === 87
      ? { minute: i * 10, p5: 40, p25: 150, p50: 320, p75: 610, p95: 1_200 }
      : { minute: i * 10, p5: 0, p25: 5, p50: 10, p75: 20, p95: 60 },
  );
  const text = (selector: string): string =>
    (fixture.nativeElement.querySelector(selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepProfileChart] }).compileComponents();
    fixture = TestBed.createComponent(StepProfileChart);
    fixture.componentRef.setInput('slots', slots);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('draws both percentile bands, the median line and a legend', () => {
    const d = (selector: string) => fixture.nativeElement.querySelector(selector).getAttribute('d') as string;
    expect(d('path.band.outer')).toMatch(/^M.*Z$/);
    expect(d('path.band.inner')).toMatch(/^M.*Z$/);
    expect(d('path.median').split('L')).toHaveLength(144);
    expect(text('.legend')).toBe('Typical (median) Middle 50% of days 90% of days');
  });

  it('labels the time of day along the bottom and the step scale on the side', () => {
    const labels = Array.from(fixture.nativeElement.querySelectorAll('text.axis-label') as NodeListOf<Element>).map(
      (t) => t.textContent!.trim(),
    );
    expect(labels).toEqual(expect.arrayContaining(['12 AM', '6 AM', '12 PM', '6 PM', '1,500']));
  });

  it('shows the percentiles for the time under the pointer', () => {
    // The plot spans 576px (640 wide less margins) from x = 52, so 2:35 PM is at 52 + 576 * 875 / 1440.
    const svg = fixture.nativeElement.querySelector('svg') as SVGSVGElement;
    svg.dispatchEvent(new MouseEvent('pointermove', { clientX: 52 + (576 * 875) / 1440 }));
    fixture.detectChanges();

    expect(text('.tooltip')).toContain('2:30 PM – 2:40 PM');
    const rows = Array.from(fixture.nativeElement.querySelectorAll('.tooltip dl > div') as NodeListOf<Element>).map(
      (row) => [row.querySelector('dt')!.textContent!.trim(), row.querySelector('dd')!.textContent!.trim()],
    );
    expect(rows).toEqual([
      ['Typical', '320'],
      ['Middle 50%', '150–610'],
      ['90% of days', '40–1,200'],
    ]);
    expect(fixture.nativeElement.querySelector('line.crosshair')).not.toBeNull();

    svg.dispatchEvent(new MouseEvent('pointerleave'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tooltip')).toBeNull();
  });

  it('gives screen readers an hourly table', () => {
    const rows = fixture.nativeElement.querySelectorAll('table tbody tr');
    expect(rows).toHaveLength(24);
    const cells = Array.from(rows[0].children as HTMLCollection).map((c) => c.textContent!.trim());
    expect(cells).toEqual(['12:00 AM', '10', '5 to 20', '0 to 60']);
  });
});
