package com.novellia.pets.record;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RecordRepository {
    List<MedicalRecord> findAll();

    List<MedicalRecord> findByPetId(UUID petId);

    Optional<MedicalRecord> findById(UUID id);

    MedicalRecord save(MedicalRecord record);

    void deleteById(UUID id);

    void deleteByPetId(UUID petId);
}
