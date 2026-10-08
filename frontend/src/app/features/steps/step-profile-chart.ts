import { Component, computed, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { StepProfileSlot } from '../../models/steps';
import { hostWidth } from './host-width';
import { niceTicks } from './steps-chart';

const HEIGHT = 240;
const MARGIN = { top: 12, right: 12, bottom: 28, left: 52 };
const MINUTES_PER_DAY = 24 * 60;
const SLOT_MINUTES = 10;
const TOOLTIP_HALF_WIDTH = 110;

type Percentile = 'p5' | 'p25' | 'p50' | 'p75' | 'p95';

/** "3 PM" style label for a time of day given in minutes after midnight. */
export function timeLabel(minute: number, withMinutes = false): string {
  const hour = Math.floor(minute / 60) % 24;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const mm = String(minute % 60).padStart(2, '0');
  return withMinutes ? `${h12}:${mm} ${suffix}` : `${h12} ${suffix}`;
}

/**
 * A typical day, drawn like an ambulatory glucose profile: the time of day runs along the bottom, the line is
 * the median steps at that time across the days, and the bands hold the middle 50% and 90% of days.
 */
@Component({
  selector: 'app-step-profile-chart',
  imports: [DecimalPipe],
  templateUrl: './step-profile-chart.html',
  styleUrl: './step-profile-chart.scss',
})
export class StepProfileChart {
  readonly slots = input.required<StepProfileSlot[]>();

  protected readonly height = HEIGHT;
  protected readonly margin = MARGIN;
  protected readonly width = hostWidth();
  protected readonly hovered = signal<number | null>(null);

  private readonly plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  protected readonly baseline = MARGIN.top + this.plotHeight;
  protected readonly right = computed(() => this.width() - MARGIN.right);

  protected readonly ticks = computed(() => niceTicks(Math.max(0, ...this.slots().map((s) => s.p95))));
  private readonly top = computed(() => this.ticks()[this.ticks().length - 1] || 1);
  protected readonly gridlines = computed(() => this.ticks().map((value) => ({ value, y: this.y(value) })));

  /** A label every 3 hours, or every 6 when narrow. */
  protected readonly hourTicks = computed(() => {
    const every = this.width() < 480 ? 6 : 3;
    const ticks = [];
    for (let hour = 0; hour <= 24; hour += every) {
      ticks.push({ x: this.x(hour * 60), label: timeLabel(hour * 60) });
    }
    return ticks;
  });

  protected readonly outerBand = computed(() => this.band('p5', 'p95'));
  protected readonly innerBand = computed(() => this.band('p25', 'p75'));
  protected readonly median = computed(() =>
    this.slots()
      .map((s, i) => `${i === 0 ? 'M' : 'L'}${this.slotX(s)},${this.y(s.p50)}`)
      .join(' '),
  );

  protected readonly hoveredSlot = computed(() => {
    const index = this.hovered();
    const slot = index === null ? undefined : this.slots()[index];
    if (!slot) {
      return null;
    }
    const x = this.slotX(slot);
    return {
      slot,
      x,
      y: this.y(slot.p50),
      left: Math.min(Math.max(x, TOOLTIP_HALF_WIDTH), this.width() - TOOLTIP_HALF_WIDTH),
      from: timeLabel(slot.minute, true),
      to: timeLabel(slot.minute + SLOT_MINUTES, true),
    };
  });

  /** One row per hour for the screen-reader table; 144 rows would be a lot to listen to. */
  protected readonly hourlyRows = computed(() =>
    this.slots()
      .filter((s) => s.minute % 60 === 0)
      .map((s) => ({ ...s, label: timeLabel(s.minute, true) })),
  );

  protected onPointerMove(event: PointerEvent, svg: Element): void {
    const slots = this.slots();
    if (slots.length === 0) {
      return;
    }
    const plotWidth = this.right() - MARGIN.left;
    const offset = event.clientX - svg.getBoundingClientRect().left - MARGIN.left;
    const minute = (offset / plotWidth) * MINUTES_PER_DAY;
    const index = Math.min(slots.length - 1, Math.max(0, Math.floor(minute / SLOT_MINUTES)));
    this.hovered.set(index);
  }

  private band(low: Percentile, high: Percentile): string {
    const slots = this.slots();
    if (slots.length === 0) {
      return '';
    }
    const upper = slots.map((s, i) => `${i === 0 ? 'M' : 'L'}${this.slotX(s)},${this.y(s[high])}`);
    const lower = [...slots].reverse().map((s) => `L${this.slotX(s)},${this.y(s[low])}`);
    return `${upper.join(' ')} ${lower.join(' ')} Z`;
  }

  /** Each slot is drawn at the middle of its ten minutes. */
  private slotX(slot: StepProfileSlot): number {
    return this.x(slot.minute + SLOT_MINUTES / 2);
  }

  private x(minute: number): number {
    return MARGIN.left + ((this.right() - MARGIN.left) * minute) / MINUTES_PER_DAY;
  }

  private y(value: number): number {
    return MARGIN.top + this.plotHeight * (1 - value / this.top());
  }
}
