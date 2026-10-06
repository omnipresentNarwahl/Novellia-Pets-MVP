package com.novellia.pets.record;

import com.novellia.pets.common.ApiValidationException;
import com.novellia.pets.common.NotFoundException;
import com.novellia.pets.common.Sorting;
import com.novellia.pets.common.StoreLock;
import com.novellia.pets.pet.Pet;
import com.novellia.pets.pet.PetRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class RecordService {
    private static final Comparator<MedicalRecord> TIE_BREAK = Comparator
            .comparing(MedicalRecord::recordDate).reversed()
            .thenComparing(Comparator.comparing(MedicalRecord::createdAt).reversed())
            .thenComparing(MedicalRecord::id);

    private static final Map<String, Sorting.Field<MedicalRecord>> SORTS = Map.of(
            "recordDate", Sorting.by(Comparator.comparing(MedicalRecord::recordDate), TIE_BREAK),
            "type", Sorting.by(Comparator.comparing(r -> r.type().label()), TIE_BREAK),
            "title", Sorting.by(Comparator.comparing(MedicalRecord::title, String.CASE_INSENSITIVE_ORDER), TIE_BREAK));

    private final PetRepository pets;
    private final RecordRepository records;
    private final StoreLock lock;
    private final Clock clock;

    public RecordService(PetRepository pets, RecordRepository records, StoreLock lock, Clock clock) {
        this.pets = pets;
        this.records = records;
        this.lock = lock;
        this.clock = clock;
    }

    public List<RecordResponse> list(UUID petId, String q, Collection<RecordType> types, String sort) {
        Comparator<MedicalRecord> order = Sorting.parse(sort, "recordDate,desc", SORTS);
        return lock.read(() -> {
            findPet(petId);
            return records.findByPetId(petId).stream()
                    .filter(RecordFilters.matchesText(q))
                    .filter(RecordFilters.typeIn(types))
                    .sorted(order)
                    .map(RecordResponse::of)
                    .toList();
        });
    }

    public RecordResponse get(UUID petId, UUID recordId) {
        return lock.read(() -> {
            findPet(petId);
            return RecordResponse.of(findRecord(petId, recordId));
        });
    }

    public RecordResponse create(UUID petId, RecordRequest request) {
        return lock.write(() -> {
            Pet pet = findPet(petId);
            check(request, pet);
            MedicalRecord record = new MedicalRecord(UUID.randomUUID(), petId, request.type(), request.title(),
                    request.recordDate(), request.provider(), request.notes(), clock.instant());
            return RecordResponse.of(records.save(record));
        });
    }

    public RecordResponse update(UUID petId, UUID recordId, RecordRequest request) {
        return lock.write(() -> {
            Pet pet = findPet(petId);
            MedicalRecord existing = findRecord(petId, recordId);
            check(request, pet);
            MedicalRecord updated = new MedicalRecord(recordId, petId, request.type(), request.title(),
                    request.recordDate(), request.provider(), request.notes(), existing.createdAt());
            return RecordResponse.of(records.save(updated));
        });
    }

    public void delete(UUID petId, UUID recordId) {
        lock.write(() -> {
            findPet(petId);
            findRecord(petId, recordId);
            records.deleteById(recordId);
        });
    }

    private Pet findPet(UUID petId) {
        return pets.findById(petId).orElseThrow(() -> new NotFoundException("Pet not found"));
    }

    /** A record id under the wrong pet is simply not found. */
    private MedicalRecord findRecord(UUID petId, UUID recordId) {
        return records.findById(recordId)
                .filter(r -> r.petId().equals(petId))
                .orElseThrow(() -> new NotFoundException("Record not found"));
    }

    private void check(RecordRequest request, Pet pet) {
        LocalDate date = request.recordDate();
        if (date.isAfter(LocalDate.now(clock))) {
            throw new ApiValidationException("recordDate", "must not be in the future");
        }
        if (pet.dateOfBirth() != null && date.isBefore(pet.dateOfBirth())) {
            throw new ApiValidationException("recordDate",
                    "must not be before the pet's date of birth (" + pet.dateOfBirth() + ")");
        }
    }
}
