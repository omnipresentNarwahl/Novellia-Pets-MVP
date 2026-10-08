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
