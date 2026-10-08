import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DailySteps } from '../../models/steps';
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

  const days: DailySteps[] = [
    { date: '2026-10-01', steps: 12_000, partial: false },
    { date: '2026-10-02', steps: 0, partial: false },
    { date: '2026-10-03', steps: 9_500, partial: false },
    { date: '2026-10-04', steps: 4_200, partial: true },
  ];
  const all = (selector: string): Element[] => Array.from(fixture.nativeElement.querySelectorAll(selector));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepsChart] }).compileComponents();
    fixture = TestBed.createComponent(StepsChart);
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();
    await fixture.whenStable();
  });

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
    all('rect.hit')[0].dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tooltip').textContent).toContain('12,000 steps');

    all('rect.hit')[3].dispatchEvent(new Event('pointerenter'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tooltip').textContent).toContain('4,200 steps');
    expect(fixture.nativeElement.querySelector('.tooltip').textContent).toContain('so far');

    fixture.nativeElement.querySelector('svg').dispatchEvent(new Event('pointerleave'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tooltip')).toBeNull();
  });

  it('has a table of the same data for screen readers', () => {
    const rows = all('table tbody tr');
    expect(rows).toHaveLength(4);
    expect(rows[3].textContent).toContain('4,200 so far');
  });
});
