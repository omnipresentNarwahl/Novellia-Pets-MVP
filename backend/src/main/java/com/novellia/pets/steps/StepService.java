package com.novellia.pets.steps;

import com.novellia.pets.common.ApiValidationException;
import com.novellia.pets.common.NotFoundException;
import com.novellia.pets.common.StoreLock;
import com.novellia.pets.pet.PetRepository;
import com.novellia.pets.steps.StepsResponse.DailySteps;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.NavigableMap;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class StepService {
    public static final int MAX_DAYS = 366;
    /** Days a typical-day profile is taken over, as in an ambulatory glucose profile. */
    public static final int PROFILE_DAYS = 14;
    /** Neighbouring slots on each side pooled into each slot's percentiles, so the curves are not spiky. */
    private static final int PROFILE_SMOOTHING = 1;

    private final PetRepository pets;
    private final StepRepository steps;
    private final StoreLock lock;
    private final Clock clock;

    public StepService(PetRepository pets, StepRepository steps, StoreLock lock, Clock clock) {
        this.pets = pets;
        this.steps = steps;
        this.lock = lock;
        this.clock = clock;
    }

    /** Daily totals for the last {@code days} days, ending with today. Days without data are left out. */
    public StepsResponse daily(UUID petId, int days) {
        if (days < 1 || days > MAX_DAYS) {
            throw new ApiValidationException("days", "must be between 1 and " + MAX_DAYS);
        }
        return lock.read(() -> {
            if (pets.findById(petId).isEmpty()) {
                throw new NotFoundException("Pet not found");
            }
            if (!steps.hasData(petId)) {
                return new StepsResponse(false, null, List.of());
            }
            LocalDate today = LocalDate.now(clock);
            List<DailySteps> daily = steps.findDays(petId, today.minusDays(days - 1L), today).entrySet().stream()
                    .map(day -> new DailySteps(day.getKey(), total(day.getValue()), day.getKey().equals(today)))
                    .toList();
            return new StepsResponse(true, averageLast7Days(steps, petId, today), daily);
        });
    }

    /**
     * Percentiles of the steps at each time of day over the last {@link #PROFILE_DAYS} complete days (today is
     * left out because it is still in progress). Each slot pools its neighbours either side, wrapping around
     * midnight, so a slot's percentiles come from 30 minutes of data.
     */
    public StepProfileResponse profile(UUID petId) {
        return lock.read(() -> {
            if (pets.findById(petId).isEmpty()) {
                throw new NotFoundException("Pet not found");
            }
            if (!steps.hasData(petId)) {
                return new StepProfileResponse(false, null, null, 0, List.of());
            }
            LocalDate today = LocalDate.now(clock);
            LocalDate from = today.minusDays(PROFILE_DAYS);
            LocalDate to = today.minusDays(1);
            List<int[]> days = List.copyOf(steps.findDays(petId, from, to).values());
            if (days.isEmpty()) {
                return new StepProfileResponse(true, from, to, 0, List.of());
            }
            int window = 2 * PROFILE_SMOOTHING + 1;
            List<StepProfileResponse.Slot> slots = new ArrayList<>(StepRepository.SLOTS_PER_DAY);
            for (int slot = 0; slot < StepRepository.SLOTS_PER_DAY; slot++) {
                double[] values = new double[days.size() * window];
                int n = 0;
                for (int[] day : days) {
                    for (int offset = -PROFILE_SMOOTHING; offset <= PROFILE_SMOOTHING; offset++) {
                        values[n++] = day[Math.floorMod(slot + offset, StepRepository.SLOTS_PER_DAY)];
                    }
                }
                Arrays.sort(values);
                slots.add(new StepProfileResponse.Slot(slot * 10, percentile(values, 0.05),
                        percentile(values, 0.25), percentile(values, 0.5), percentile(values, 0.75),
                        percentile(values, 0.95)));
            }
            return new StepProfileResponse(true, from, to, days.size(), slots);
        });
    }

    /** Linear interpolation between the closest ranks of sorted values. */
    static long percentile(double[] sorted, double p) {
        double rank = (sorted.length - 1) * p;
        int below = (int) Math.floor(rank);
        int above = Math.min(below + 1, sorted.length - 1);
        return Math.round(sorted[below] + (rank - below) * (sorted[above] - sorted[below]));
    }

    /**
     * Mean daily steps over the seven complete days before {@code today} (today is still in progress, so it
     * would drag the average down). Null when none of those days has data. Callers hold the store lock.
     */
    public static Long averageLast7Days(StepRepository steps, UUID petId, LocalDate today) {
        NavigableMap<LocalDate, int[]> week = steps.findDays(petId, today.minusDays(7), today.minusDays(1));
        if (week.isEmpty()) {
            return null;
        }
        long sum = week.values().stream().mapToLong(StepService::total).sum();
        return Math.round((double) sum / week.size());
    }

    private static long total(int[] slots) {
        return Arrays.stream(slots).asLongStream().sum();
    }
}
