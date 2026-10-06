package com.novellia.pets.support;

import com.novellia.pets.common.StoreLock;
import com.novellia.pets.dashboard.DashboardService;
import com.novellia.pets.pet.InMemoryPetRepository;
import com.novellia.pets.pet.PetRepository;
import com.novellia.pets.pet.PetService;
import com.novellia.pets.record.InMemoryRecordRepository;
import com.novellia.pets.record.RecordRepository;
import com.novellia.pets.record.RecordService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

/** Wires the real services over fresh in-memory repositories and a fixed clock. */
public class Fixtures {
    public static final LocalDate TODAY = LocalDate.of(2026, 10, 6);

    public final Clock clock = Clock.fixed(Instant.parse("2026-10-06T12:00:00Z"), ZoneOffset.UTC);
    public final PetRepository pets = new InMemoryPetRepository();
    public final RecordRepository records = new InMemoryRecordRepository();
    public final StoreLock lock = new StoreLock();
    public final PetService petService = new PetService(pets, records, lock, clock);
    public final RecordService recordService = new RecordService(pets, records, lock, clock);
    public final DashboardService dashboardService = new DashboardService(pets, records, lock, clock);
}
