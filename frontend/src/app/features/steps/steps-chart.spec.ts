import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepColumn } from './step-columns';
import { StepsChart, niceTicks } from './steps-chart';

describe('niceTicks', () => {
  it('rounds the top up to a round number in friendly steps', () => {
    expect(niceTicks(14_300)).toEqual([0, 5_000, 10_000, 15_000]);
    expect(niceTicks(3_100)).toEqual([0, 1_000, 2_000, 3_000, 4_000]);
    expect(niceTicks(0)).toEqual([0]);
  });
});

describe('StepsChart', () => {
  let fixture: ComponentFixture<StepsChart>;

  const day = (date: string, steps: number, partial = false): StepColumn => ({ start: date, end: date, steps, partial });
  const days: StepColumn[] = [
    day('2026-10-01', 12_000),
    day('2026-10-02', 0),
    day('2026-10-03', 9_500),
    day('2026-10-04', 4_200, true),
  ];
  const all = (selector: string): Element[] => Array.from(fixture.nativeElement.querySelectorAll(selector));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepsChart] }).compileComponents();
    fixture = TestBed.createComponent(StepsChart);
    fixture.componentRef.setInput('columns', days);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const hover = (index: number) => {
    all('rect.hit')[index].dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('.tooltip').textContent.replace(/\s+/g, ' ') as string;
  };

  it('draws a column per day with steps, today lighter, and a hover target for every day', () => {
    expect(all('path.bar')).toHaveLength(3);
    expect(all('path.bar.partial')).toHaveLength(1);
    expect(all('rect.hit')).toHaveLength(4);
  });

  it('labels the axis, including today', () => {
    const labels = all('text.axis-label').map((t) => t.textContent!.trim());
    expect(labels).toContain('15,000');
    expect(labels).toContain('Today');
  });

  it('shows the exact count on hover and marks today as so far', async () => {
    expect(hover(0)).toContain('Thu, Oct 1');
    expect(hover(0)).toContain('12,000 steps');
    expect(hover(3)).toContain('4,200 steps so far');

    fixture.nativeElement.querySelector('svg').dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tooltip')).toBeNull();
  });

  it('has a table of the same data for screen readers', () => {
    const rows = all('table tbody tr');
    expect(rows).toHaveLength(4);
    expect(rows[3].textContent!.replace(/\s+/g, ' ')).toContain('4,200 steps so far');
  });

  it('labels weeks by their dates and shows the average per day', async () => {
    fixture.componentRef.setInput('unit', 'week');
    fixture.componentRef.setInput('columns', [
      { start: '2026-09-21', end: '2026-09-27', steps: 11_000, partial: false },
      { start: '2026-09-28', end: '2026-10-04', steps: 12_500, partial: true },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(all('text.axis-label').map((t) => t.textContent!.trim())).toContain('This week');
    expect(hover(0)).toContain('Sep 21 – Sep 27');
    expect(hover(0)).toContain('11,000 steps a day');
  });

  it('labels months by name', async () => {
    fixture.componentRef.setInput('unit', 'month');
    fixture.componentRef.setInput('columns', [
      { start: '2026-09-01', end: '2026-09-30', steps: 11_000, partial: false },
      { start: '2026-10-01', end: '2026-10-31', steps: 12_500, partial: true },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(all('text.axis-label').map((t) => t.textContent!.trim())).toEqual(
      expect.arrayContaining(['Sep', 'Oct']),
    );
    expect(hover(1)).toContain('October 2026');
    expect(hover(1)).toContain('12,500 steps a day so far');
  });
});
