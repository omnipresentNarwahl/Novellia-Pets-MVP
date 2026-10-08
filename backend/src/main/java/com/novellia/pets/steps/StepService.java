package com.novellia.pets.steps;

import com.novellia.pets.common.ApiValidationException;
import com.novellia.pets.common.NotFoundException;
import com.novellia.pets.common.StoreLock;
import com.novellia.pets.pet.PetRepository;
import com.novellia.pets.steps.StepsResponse.DailySteps;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.NavigableMap;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class StepService {
    public static final int MAX_DAYS = 366;

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
