package com.novellia.pets.steps;

import java.time.LocalDate;
import java.util.Map;
import java.util.NavigableMap;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryStepRepository implements StepRepository {
    private final Map<UUID, NavigableMap<LocalDate, int[]>> steps = new ConcurrentHashMap<>();

    @Override
    public void saveDay(UUID petId, LocalDate date, int[] slots) {
        if (slots.length != SLOTS_PER_DAY) {
            throw new IllegalArgumentException("Expected " + SLOTS_PER_DAY + " slots, got " + slots.length);
        }
        steps.computeIfAbsent(petId, id -> new ConcurrentSkipListMap<>()).put(date, slots.clone());
    }

    @Override
    public NavigableMap<LocalDate, int[]> findDays(UUID petId, LocalDate from, LocalDate to) {
        NavigableMap<LocalDate, int[]> days = steps.get(petId);
        NavigableMap<LocalDate, int[]> result = new TreeMap<>();
        if (days != null && !from.isAfter(to)) {
            days.subMap(from, true, to, true).forEach((date, slots) -> result.put(date, slots.clone()));
        }
        return result;
    }

    @Override
    public boolean hasData(UUID petId) {
        NavigableMap<LocalDate, int[]> days = steps.get(petId);
        return days != null && !days.isEmpty();
    }

    @Override
    public void deleteByPetId(UUID petId) {
        steps.remove(petId);
    }
}
