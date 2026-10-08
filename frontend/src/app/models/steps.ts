export interface DailySteps {
  date: string;
  steps: number;
  /** True for today, which is still in progress. */
  partial: boolean;
}

export interface StepsResponse {
  /** False, with no days, for a pet without a tracker. */
  tracked: boolean;
  /** Mean over the last seven complete days, or null when they have no data. */
  averageLast7Days: number | null;
  days: DailySteps[];
}

/** Percentiles of the steps in the ten minutes starting `minute` minutes after midnight. */
export interface StepProfileSlot {
  minute: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

/** A typical day in the style of an ambulatory glucose profile, over the last `days` complete days. */
export interface StepProfile {
  tracked: boolean;
  from: string | null;
  to: string | null;
  days: number;
  slots: StepProfileSlot[];
}
