package com.novellia.pets.record;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record MedicalRecord(
        UUID id,
        UUID petId,
        RecordType type,
        String title,
        LocalDate recordDate,
        String provider,
        String notes,
        Instant createdAt) {
}
