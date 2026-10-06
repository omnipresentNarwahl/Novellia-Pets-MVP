package com.novellia.pets.record;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryRecordRepository implements RecordRepository {
    private final Map<UUID, MedicalRecord> records = new ConcurrentHashMap<>();

    @Override
    public List<MedicalRecord> findAll() {
        return List.copyOf(records.values());
    }

    @Override
    public List<MedicalRecord> findByPetId(UUID petId) {
        return records.values().stream().filter(r -> r.petId().equals(petId)).toList();
    }

    @Override
    public Optional<MedicalRecord> findById(UUID id) {
        return Optional.ofNullable(records.get(id));
    }

    @Override
    public MedicalRecord save(MedicalRecord record) {
        records.put(record.id(), record);
        return record;
    }

    @Override
    public void deleteById(UUID id) {
        records.remove(id);
    }

    @Override
    public void deleteByPetId(UUID petId) {
        records.values().removeIf(r -> r.petId().equals(petId));
    }
}
