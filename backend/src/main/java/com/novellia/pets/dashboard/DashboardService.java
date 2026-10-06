package com.novellia.pets.dashboard;

import com.novellia.pets.common.StoreLock;
import com.novellia.pets.dashboard.DashboardResponse.LabelCount;
import com.novellia.pets.dashboard.DashboardResponse.PetSummary;
import com.novellia.pets.dashboard.DashboardResponse.RecentRecord;
import com.novellia.pets.pet.Pet;
import com.novellia.pets.pet.PetRepository;
import com.novellia.pets.pet.Species;
import com.novellia.pets.record.MedicalRecord;
import com.novellia.pets.record.RecordRepository;
import com.novellia.pets.record.RecordType;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
    private static final int RECENT_LIMIT = 5;

    private final PetRepository pets;
    private final RecordRepository records;
    private final StoreLock lock;
    private final Clock clock;

    public DashboardService(PetRepository pets, RecordRepository records, StoreLock lock, Clock clock) {
        this.pets = pets;
        this.records = records;
        this.lock = lock;
        this.clock = clock;
    }

    public DashboardResponse build() {
        return lock.read(() -> {
            List<Pet> allPets = pets.findAll();
            List<MedicalRecord> allRecords = records.findAll();
            LocalDate cutoff = LocalDate.now(clock).minusDays(30);

            long recent30 = allRecords.stream().filter(r -> !r.recordDate().isBefore(cutoff)).count();

            Map<Species, Long> speciesCounts = allPets.stream()
                    .collect(Collectors.groupingBy(Pet::species, Collectors.counting()));
            Map<RecordType, Long> typeCounts = allRecords.stream()
                    .collect(Collectors.groupingBy(MedicalRecord::type, Collectors.counting()));

            Map<UUID, List<MedicalRecord>> byPet = allRecords.stream()
                    .collect(Collectors.groupingBy(MedicalRecord::petId));
            Map<UUID, Pet> petsById = allPets.stream().collect(Collectors.toMap(Pet::id, Function.identity()));

            List<PetSummary> summaries = allPets.stream()
                    .sorted(Comparator.comparing(Pet::name, String.CASE_INSENSITIVE_ORDER).thenComparing(Pet::id))
                    .map(pet -> summarize(pet, byPet.getOrDefault(pet.id(), List.of())))
                    .toList();

            List<RecentRecord> newest = allRecords.stream()
                    .sorted(Comparator.comparing(MedicalRecord::recordDate).reversed()
                            .thenComparing(Comparator.comparing(MedicalRecord::createdAt).reversed())
                            .thenComparing(MedicalRecord::id))
                    .limit(RECENT_LIMIT)
                    .map(r -> new RecentRecord(r.id(), r.petId(), petsById.get(r.petId()).name(), r.type(),
                            r.title(), r.recordDate()))
                    .toList();

            return new DashboardResponse(allPets.size(), allRecords.size(), recent30,
                    counts(Species.values(), speciesCounts, Species::label),
                    counts(RecordType.values(), typeCounts, RecordType::label),
                    summaries, newest);
        });
    }

    private static PetSummary summarize(Pet pet, List<MedicalRecord> petRecords) {
        LocalDate last = petRecords.stream().map(MedicalRecord::recordDate)
                .max(Comparator.naturalOrder()).orElse(null);
        return new PetSummary(pet.id(), pet.name(), pet.species(), pet.speciesOther(), pet.dateOfBirth(),
                petRecords.size(), last);
    }

    /** Counts in enum order, leaving out values with no entries. Other pets are all one bucket. */
    private static <E extends Enum<E>> List<LabelCount> counts(
            E[] values, Map<E, Long> counts, Function<E, String> label) {
        return Arrays.stream(values)
                .filter(v -> counts.getOrDefault(v, 0L) > 0)
                .map(v -> new LabelCount(label.apply(v), counts.get(v)))
                .toList();
    }
}
