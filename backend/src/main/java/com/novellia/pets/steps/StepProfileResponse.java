package com.novellia.pets.steps;

import java.time.LocalDate;
import java.util.List;

/**
 * A "typical day" for a pet, in the style of an ambulatory glucose profile: for each ten-minute slot of the
 * day, percentiles of the step counts at that time across the recent days. {@code tracked} is false, with no
 * slots, for a pet without a tracker; {@code days} is how many days the percentiles were taken over.
 */
public record StepProfileResponse(boolean tracked, LocalDate from, LocalDate to, int days, List<Slot> slots) {

    /** Percentiles of the steps in the ten minutes starting {@code minute} minutes after midnight. */
    public record Slot(int minute, long p5, long p25, long p50, long p75, long p95) {
    }
}
