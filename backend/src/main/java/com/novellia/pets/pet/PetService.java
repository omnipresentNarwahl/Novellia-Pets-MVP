package com.novellia.pets.pet;

import com.novellia.pets.common.ApiValidationException;
import com.novellia.pets.common.NotFoundException;
import com.novellia.pets.common.Sorting;
import com.novellia.pets.common.StoreLock;
import com.novellia.pets.record.MedicalRecord;
import com.novellia.pets.record.RecordRepository;
import com.novellia.pets.steps.StepRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class PetService {
    private static final Comparator<Pet> TIE_BREAK =
            Comparator.comparing(Pet::name, String.CASE_INSENSITIVE_ORDER).thenComparing(Pet::id);

    private static final Map<String, Sorting.Field<Pet>> SORTS = Map.of(
            "name", Sorting.by(TIE_BREAK, TIE_BREAK),
            "createdAt", Sorting.by(Comparator.comparing(Pet::createdAt), TIE_BREAK),
            "dateOfBirth", Sorting.byNullsLast(Pet::dateOfBirth, TIE_BREAK));

    private final PetRepository pets;
    private final RecordRepository records;
    private final StepRepository steps;
    private final StoreLock lock;
    private final Clock clock;

    public PetService(PetRepository pets, RecordRepository records, StepRepository steps, StoreLock lock,
            Clock clock) {
        this.pets = pets;
        this.records = records;
        this.steps = steps;
        this.lock = lock;
        this.clock = clock;
    }

    public List<PetResponse> list(String q, Collection<Species> species, String sort) {
        Comparator<Pet> order = Sorting.parse(sort, "name,asc", SORTS);
        return lock.read(() -> {
            Map<UUID, List<MedicalRecord>> recordsByPet =
                    records.findAll().stream().collect(Collectors.groupingBy(MedicalRecord::petId));
            return pets.findAll().stream()
                    .filter(PetFilters.matchesText(q))
                    .filter(PetFilters.speciesIn(species))
                    .sorted(order)
                    .map(pet -> toResponse(pet, recordsByPet.getOrDefault(pet.id(), List.of())))
                    .toList();
        });
    }

    public PetResponse get(UUID id) {
        return lock.read(() -> {
            Pet pet = find(id);
            return toResponse(pet, records.findByPetId(id));
        });
    }

    public PetResponse create(PetRequest request) {
        Pet pet = new Pet(UUID.randomUUID(), request.name(), request.species(), speciesOther(request),
                request.breed(), request.dateOfBirth(), request.notes(), clock.instant());
        return lock.write(() -> {
            check(request, List.of());
            pets.save(pet);
            return toResponse(pet, List.of());
        });
    }

    public PetResponse update(UUID id, PetRequest request) {
        return lock.write(() -> {
            Pet existing = find(id);
            List<MedicalRecord> petRecords = records.findByPetId(id);
            check(request, petRecords);
            Pet updated = new Pet(id, request.name(), request.species(), speciesOther(request), request.breed(),
                    request.dateOfBirth(), request.notes(), existing.createdAt());
            pets.save(updated);
            return toResponse(updated, petRecords);
        });
    }

    public void delete(UUID id) {
        lock.write(() -> {
            find(id);
            records.deleteByPetId(id);
            steps.deleteByPetId(id);
            pets.deleteById(id);
        });
    }

    private Pet find(UUID id) {
        return pets.findById(id).orElseThrow(() -> new NotFoundException("Pet not found"));
    }

    /** Rules that involve more than one field or entity. */
    private void check(PetRequest request, List<MedicalRecord> petRecords) {
        Map<String, String> errors = new LinkedHashMap<>();
        if (request.species() == Species.OTHER && request.speciesOther() == null) {
            errors.put("speciesOther", "is required when species is Other");
        }
        LocalDate dob = request.dateOfBirth();
        if (dob != null) {
            LocalDate earliest = petRecords.stream().map(MedicalRecord::recordDate)
                    .min(Comparator.naturalOrder()).orElse(null);
            if (dob.isAfter(LocalDate.now(clock))) {
                errors.put("dateOfBirth", "must not be in the future");
            } else if (earliest != null && dob.isAfter(earliest)) {
                errors.put("dateOfBirth", "must not be after the pet's earliest record (" + earliest + ")");
            }
        }
        if (!errors.isEmpty()) {
            throw new ApiValidationException(errors);
        }
    }

    /** Only an Other pet keeps a description, so a stale one cannot linger after a species change. */
    private static String speciesOther(PetRequest request) {
        return request.species() == Species.OTHER ? request.speciesOther() : null;
    }

    private static PetResponse toResponse(Pet pet, List<MedicalRecord> petRecords) {
        LocalDate last = petRecords.stream().map(MedicalRecord::recordDate)
                .max(Comparator.naturalOrder()).orElse(null);
        return PetResponse.of(pet, petRecords.size(), last);
    }
}
