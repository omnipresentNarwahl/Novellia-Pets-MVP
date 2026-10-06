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
        Instant createdAt) {

    public static PetResponse of(Pet pet, long recordCount, LocalDate lastRecordDate) {
        return new PetResponse(pet.id(), pet.name(), pet.species(), pet.speciesOther(), pet.breed(),
                pet.dateOfBirth(), pet.notes(), recordCount, lastRecordDate, pet.createdAt());
    }
}
