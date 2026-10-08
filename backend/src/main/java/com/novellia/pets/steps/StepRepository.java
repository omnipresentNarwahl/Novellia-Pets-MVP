package com.novellia.pets.steps;

import java.time.LocalDate;
import java.util.NavigableMap;
import java.util.UUID;

/**
 * Step counts per pet per day, each day split into {@link #SLOTS_PER_DAY} ten-minute slots in the app clock's
 * zone (slot i covers minutes [i*10, i*10+10) of the day).
 */
public interface StepRepository {
    int SLOTS_PER_DAY = 24 * 6;

    void saveDay(UUID petId, LocalDate date, int[] slots);

    /** Days with data between {@code from} and {@code to}, both inclusive, oldest first. */
    NavigableMap<LocalDate, int[]> findDays(UUID petId, LocalDate from, LocalDate to);

    boolean hasData(UUID petId);

    void deleteByPetId(UUID petId);
}
