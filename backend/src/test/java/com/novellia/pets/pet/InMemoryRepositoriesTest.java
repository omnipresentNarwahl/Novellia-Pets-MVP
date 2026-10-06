package com.novellia.pets.pet;

import static org.assertj.core.api.Assertions.assertThat;

import com.novellia.pets.record.InMemoryRecordRepository;
import com.novellia.pets.record.MedicalRecord;
import com.novellia.pets.record.RecordRepository;
import com.novellia.pets.record.RecordType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class InMemoryRepositoriesTest {

    private static Pet pet(String name) {
        return new Pet(UUID.randomUUID(), name, Species.DOG, null, null, null, null, Instant.now());
    }

    private static MedicalRecord record(UUID petId) {
        return new MedicalRecord(UUID.randomUUID(), petId, RecordType.OTHER, "t", LocalDate.now(), null, null, Instant.now());
    }

    @Test
    void petRepositorySavesFindsReplacesAndDeletes() {
        PetRepository repo = new InMemoryPetRepository();
        Pet a = repo.save(pet("a"));
        assertThat(repo.findById(a.id())).contains(a);
        assertThat(repo.findAll()).containsExactly(a);

        Pet renamed = new Pet(a.id(), "b", a.species(), null, null, null, null, a.createdAt());
        repo.save(renamed);
        assertThat(repo.findAll()).containsExactly(renamed);

        repo.deleteById(a.id());
        assertThat(repo.findById(a.id())).isEmpty();
        assertThat(repo.findAll()).isEmpty();
    }

    @Test
    void recordRepositoryFindsByPetAndDeletesAllOfAPetsRecords() {
        RecordRepository repo = new InMemoryRecordRepository();
        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        repo.save(record(p1));
        repo.save(record(p1));
        MedicalRecord keep = repo.save(record(p2));

        assertThat(repo.findByPetId(p1)).hasSize(2);
        assertThat(repo.findAll()).hasSize(3);

        repo.deleteByPetId(p1);
        assertThat(repo.findByPetId(p1)).isEmpty();
        assertThat(repo.findAll()).containsExactly(keep);

        repo.deleteById(keep.id());
        assertThat(repo.findById(keep.id())).isEmpty();
    }
}
