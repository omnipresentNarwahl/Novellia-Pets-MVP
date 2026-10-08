package com.novellia.pets.steps;

import java.time.LocalDate;
import java.util.List;

/**
 * Daily step totals for one pet. {@code tracked} is false, with no days, for a pet without a tracker.
 * {@code averageLast7Days} is null when there is no data for the last seven complete days.
 */
public record StepsResponse(boolean tracked, Long averageLast7Days, List<DailySteps> days) {

    /** {@code partial} marks today, which is still in progress. */
    public record DailySteps(LocalDate date, long steps, boolean partial) {
    }
}
