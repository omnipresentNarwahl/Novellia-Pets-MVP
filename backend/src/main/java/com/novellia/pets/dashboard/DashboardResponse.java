package com.novellia.pets.dashboard;

import com.novellia.pets.pet.Species;
import com.novellia.pets.record.RecordType;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DashboardResponse(
        long totalPets,
        long totalRecords,
        long recordsLast30Days,
        List<LabelCount> petsBySpecies,
        List<LabelCount> recordsByType,
        List<PetSummary> pets,
        List<RecentRecord> recentRecords) {

    public record LabelCount(String label, long count) {
    }

    public record PetSummary(
            UUID petId,
            String name,
            Species species,
            String speciesOther,
            LocalDate dateOfBirth,
            long recordCount,
            LocalDate lastRecordDate) {
    }

    public record RecentRecord(
            UUID id,
            UUID petId,
            String petName,
            RecordType type,
            String title,
            LocalDate recordDate) {
    }
}
