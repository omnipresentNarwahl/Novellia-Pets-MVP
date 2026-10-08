package com.novellia.pets.pet;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record PetResponse(
        UUID id,
        String name,
        Species species,
        String speciesOther,
        String breed,
        LocalDate dateOfBirth,
        String notes,
        long recordCount,
        LocalDate lastRecordDate,
        /** Mean daily steps over the last seven complete days; null for a pet without a tracker. */
        Long averageDailySteps,
        Instant createdAt) {

    public static PetResponse of(Pet pet, long recordCount, LocalDate lastRecordDate, Long averageDailySteps) {
        return new PetResponse(pet.id(), pet.name(), pet.species(), pet.speciesOther(), pet.breed(),
                pet.dateOfBirth(), pet.notes(), recordCount, lastRecordDate, averageDailySteps, pet.createdAt());
    }
}
