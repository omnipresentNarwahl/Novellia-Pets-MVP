package com.novellia.pets.pet;

import com.novellia.pets.common.Strings;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Strings are trimmed on construction, so validation sees the trimmed value. */
public record PetRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull Species species,
        @Size(max = 50) String speciesOther,
        @Size(max = 100) String breed,
        LocalDate dateOfBirth,
        @Size(max = 2000) String notes) {

    public PetRequest {
        name = Strings.clean(name);
        speciesOther = Strings.clean(speciesOther);
        breed = Strings.clean(breed);
        notes = Strings.clean(notes);
    }
}
