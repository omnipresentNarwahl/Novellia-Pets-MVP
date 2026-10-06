package com.novellia.pets.pet;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record Pet(
        UUID id,
        String name,
        Species species,
        String speciesOther,
        String breed,
        LocalDate dateOfBirth,
        String notes,
        Instant createdAt) {
}
