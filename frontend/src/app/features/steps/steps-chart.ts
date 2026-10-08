import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { DailySteps } from '../../models/steps';

const HEIGHT = 220;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 52 };
const BAR_GAP = 2;
const CORNER = 4;
const TOOLTIP_HALF_WIDTH = 72;

/** Ticks from 0 up to a round number at or above `max`, about `count` steps apart (steps of 1, 2, 2.5 or 5). */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) {
    return [0];
  }
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough)!;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 2; t += step) {
    ticks.push(t);
  }
  return ticks;
}

interface Bar {
  day: DailySteps;
  /** Left edge and width of the whole column, used as the hover target. */
  bandX: number;
  bandWidth: number;
  centerX: number;
  top: number;
  path: string | null;
}

/** Daily step totals as columns. Hover a column for its exact count; screen readers get a table instead. */
@Component({
  selector: 'app-steps-chart',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './steps-chart.html',
  styleUrl: './steps-chart.scss',
})
export class StepsChart {
  readonly days = input.required<DailySteps[]>();

  protected readonly height = HEIGHT;
  protected readonly margin = MARGIN;
  protected readonly width = signal(640);
  protected readonly hovered = signal<number | null>(null);

  private readonly plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  protected readonly baseline = MARGIN.top + this.plotHeight;

  protected readonly ticks = computed(() => niceTicks(Math.max(0, ...this.days().map((d) => d.steps))));
  private readonly top = computed(() => this.ticks()[this.ticks().length - 1] || 1);

  protected readonly gridlines = computed(() => this.ticks().map((value) => ({ value, y: this.y(value) })));

  protected readonly bars = computed<Bar[]>(() => {
    const days = this.days();
    const plotWidth = Math.max(0, this.width() - MARGIN.left - MARGIN.right);
    const band = days.length ? plotWidth / days.length : 0;
    const barWidth = Math.max(1, band - BAR_GAP);
    return days.map((day, i) => {
      const bandX = MARGIN.left + i * band;
      const x = bandX + BAR_GAP / 2;
      const top = this.y(day.steps);
      return {
        day,
        bandX,
        bandWidth: band,
        centerX: bandX + band / 2,
        top,
        path: roundedTopBar(x, top, barWidth, this.baseline - top),
      };
    });
  });

  /** A date label under every seventh column, counting back from the newest so today is always labelled. */
  protected readonly xLabels = computed(() => {
    const bars = this.bars();
    return bars.filter((_, i) => (bars.length - 1 - i) % 7 === 0);
  });

  protected readonly tooltip = computed(() => {
    const index = this.hovered();
    const bar = index === null ? undefined : this.bars()[index];
    if (!bar) {
      return null;
    }
    const left = Math.min(Math.max(bar.centerX, TOOLTIP_HALF_WIDTH), this.width() - TOOLTIP_HALF_WIDTH);
    return { day: bar.day, left, top: bar.top };
  });

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.width.set(host.clientWidth || this.width());
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(([entry]) => this.width.set(entry.contentRect.width));
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  private y(value: number): number {
    return MARGIN.top + this.plotHeight * (1 - value / this.top());
  }
}

/** A column anchored to the baseline with rounded top corners; null when there is nothing to draw. */
function roundedTopBar(x: number, y: number, width: number, height: number): string | null {
  if (height <= 0) {
    return null;
  }
  const r = Math.min(CORNER, width / 2, height);
  const bottom = y + height;
  return (
    `M${x},${bottom} V${y + r} Q${x},${y} ${x + r},${y} ` +
    `H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${bottom} Z`
  );
}
