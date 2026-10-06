package com.novellia.pets.record;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record RecordResponse(
        UUID id,
        UUID petId,
        RecordType type,
        String title,
        LocalDate recordDate,
        String provider,
        String notes,
        Instant createdAt) {

    public static RecordResponse of(MedicalRecord r) {
        return new RecordResponse(r.id(), r.petId(), r.type(), r.title(), r.recordDate(), r.provider(),
                r.notes(), r.createdAt());
    }
}
