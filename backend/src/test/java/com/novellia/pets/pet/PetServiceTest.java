package com.novellia.pets.pet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.novellia.pets.common.ApiValidationException;
import com.novellia.pets.common.NotFoundException;
import com.novellia.pets.record.RecordRequest;
import com.novellia.pets.record.RecordType;
import com.novellia.pets.support.Fixtures;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class PetServiceTest {
    private final Fixtures f = new Fixtures();

    private PetRequest dog(String name, LocalDate dob) {
        return new PetRequest(name, Species.DOG, null, "Beagle", dob, null);
    }

    @Test
    void otherSpeciesRequiresADescription() {
        assertThatThrownBy(() -> f.petService.create(new PetRequest("Zed", Species.OTHER, null, null, null, null)))
                .isInstanceOfSatisfying(ApiValidationException.class,
                        e -> assertThat(e.errors()).containsKey("speciesOther"));
        assertThatThrownBy(() -> f.petService.create(new PetRequest("Zed", Species.OTHER, "   ", null, null, null)))
                .isInstanceOf(ApiValidationException.class);
    }

    @Test
    void otherSpeciesDescriptionIsTrimmedAndKept() {
        PetResponse pet = f.petService.create(new PetRequest("Zed", Species.OTHER, "  Ferret ", null, null, null));
        assertThat(pet.speciesOther()).isEqualTo("Ferret");
    }

    @Test
    void descriptionIsDroppedForOtherSpecies() {
        PetResponse pet = f.petService.create(new PetRequest("Rex", Species.DOG, "Axolotl", null, null, null));
        assertThat(pet.speciesOther()).isNull();
    }

    @Test
    void changingFromOtherToDogClearsTheDescription() {
        PetResponse pet = f.petService.create(new PetRequest("Zed", Species.OTHER, "Ferret", null, null, null));
        PetResponse updated = f.petService.update(pet.id(), new PetRequest("Zed", Species.DOG, "Ferret", null, null, null));
        assertThat(updated.species()).isEqualTo(Species.DOG);
        assertThat(updated.speciesOther()).isNull();
    }

    @Test
    void dateOfBirthCannotBeInTheFuture() {
        assertThatThrownBy(() -> f.petService.create(dog("Rex", Fixtures.TODAY.plusDays(1))))
                .isInstanceOfSatisfying(ApiValidationException.class,
                        e -> assertThat(e.errors()).containsKey("dateOfBirth"));
        assertThat(f.petService.create(dog("Rex", Fixtures.TODAY)).dateOfBirth()).isEqualTo(Fixtures.TODAY);
    }

    @Test
    void dateOfBirthCannotBeAfterTheEarliestRecord() {
        PetResponse pet = f.petService.create(dog("Rex", LocalDate.of(2020, 1, 1)));
        f.recordService.create(pet.id(), new RecordRequest(RecordType.VET_VISIT, "Checkup", LocalDate.of(2021, 5, 1), null, null));
        f.recordService.create(pet.id(), new RecordRequest(RecordType.VET_VISIT, "Later", LocalDate.of(2023, 5, 1), null, null));

        assertThatThrownBy(() -> f.petService.update(pet.id(), dog("Rex", LocalDate.of(2021, 5, 2))))
                .isInstanceOfSatisfying(ApiValidationException.class,
                        e -> assertThat(e.errors().get("dateOfBirth")).contains("2021-05-01"));

        assertThat(f.petService.update(pet.id(), dog("Rex", LocalDate.of(2021, 5, 1))).dateOfBirth())
                .isEqualTo(LocalDate.of(2021, 5, 1));
    }

    @Test
    void responseCarriesRecordCountAndLastRecordDate() {
        PetResponse pet = f.petService.create(dog("Rex", null));
        assertThat(pet.recordCount()).isZero();
        assertThat(pet.lastRecordDate()).isNull();

        f.recordService.create(pet.id(), new RecordRequest(RecordType.VET_VISIT, "A", LocalDate.of(2025, 1, 1), null, null));
        f.recordService.create(pet.id(), new RecordRequest(RecordType.VET_VISIT, "B", LocalDate.of(2026, 1, 1), null, null));

        PetResponse loaded = f.petService.get(pet.id());
        assertThat(loaded.recordCount()).isEqualTo(2);
        assertThat(loaded.lastRecordDate()).isEqualTo(LocalDate.of(2026, 1, 1));
    }

    @Test
    void deletingAPetDeletesItsRecordsOnly() {
        PetResponse a = f.petService.create(dog("A", null));
        PetResponse b = f.petService.create(dog("B", null));
        f.recordService.create(a.id(), new RecordRequest(RecordType.OTHER, "x", Fixtures.TODAY, null, null));
        f.recordService.create(b.id(), new RecordRequest(RecordType.OTHER, "y", Fixtures.TODAY, null, null));

        f.petService.delete(a.id());

        assertThat(f.pets.findById(a.id())).isEmpty();
        assertThat(f.records.findByPetId(a.id())).isEmpty();
        assertThat(f.records.findByPetId(b.id())).hasSize(1);
        assertThatThrownBy(() -> f.petService.delete(a.id())).isInstanceOf(NotFoundException.class);
    }

    @Test
    void unknownPetIsNotFound() {
        assertThatThrownBy(() -> f.petService.get(UUID.randomUUID())).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> f.petService.update(UUID.randomUUID(), dog("x", null)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateKeepsIdAndCreatedAt() {
        PetResponse pet = f.petService.create(dog("Rex", null));
        PetResponse updated = f.petService.update(pet.id(), dog("Rexy", null));
        assertThat(updated.id()).isEqualTo(pet.id());
        assertThat(updated.createdAt()).isEqualTo(pet.createdAt());
        assertThat(updated.name()).isEqualTo("Rexy");
    }

    @Test
    void textSearchMatchesNameBreedAndOtherDescriptionCaseInsensitively() {
        f.petService.create(new PetRequest("Biscuit", Species.DOG, null, "Beagle", null, null));
        f.petService.create(new PetRequest("Miso", Species.CAT, null, "Siamese", null, null));
        f.petService.create(new PetRequest("Pancake", Species.OTHER, "Axolotl", null, null, null));

        assertThat(names(f.petService.list("BIS", null, null))).containsExactly("Biscuit");
        assertThat(names(f.petService.list("siam", null, null))).containsExactly("Miso");
        assertThat(names(f.petService.list("axo", null, null))).containsExactly("Pancake");
        assertThat(names(f.petService.list("  ", null, null))).hasSize(3);
    }

    @Test
    void speciesFilterAcceptsSeveralValues() {
        f.petService.create(new PetRequest("Biscuit", Species.DOG, null, null, null, null));
        f.petService.create(new PetRequest("Miso", Species.CAT, null, null, null, null));
        f.petService.create(new PetRequest("Pancake", Species.OTHER, "Axolotl", null, null, null));

        assertThat(names(f.petService.list(null, List.of(Species.DOG, Species.OTHER), null)))
                .containsExactly("Biscuit", "Pancake");
    }

    @Test
    void sortsByNameCreatedAtAndDateOfBirthWithUnknownBirthdatesLast() {
        f.petService.create(dog("bravo", LocalDate.of(2020, 1, 1)));
        f.petService.create(dog("Alpha", LocalDate.of(2022, 1, 1)));
        f.petService.create(dog("Charlie", null));

        assertThat(names(f.petService.list(null, null, null))).containsExactly("Alpha", "bravo", "Charlie");
        assertThat(names(f.petService.list(null, null, "name,desc"))).containsExactly("Charlie", "bravo", "Alpha");
        assertThat(names(f.petService.list(null, null, "dateOfBirth,asc"))).containsExactly("bravo", "Alpha", "Charlie");
        assertThat(names(f.petService.list(null, null, "dateOfBirth,desc"))).containsExactly("Alpha", "bravo", "Charlie");
        assertThat(f.petService.list(null, null, "createdAt,asc")).hasSize(3);
    }

    @Test
    void unknownSortFieldOrDirectionIsRejected() {
        assertThatThrownBy(() -> f.petService.list(null, null, "color,asc")).isInstanceOf(ApiValidationException.class);
        assertThatThrownBy(() -> f.petService.list(null, null, "name,sideways")).isInstanceOf(ApiValidationException.class);
        assertThatThrownBy(() -> f.petService.list(null, null, "name,asc,x")).isInstanceOf(ApiValidationException.class);
    }

    private static List<String> names(List<PetResponse> pets) {
        return pets.stream().map(PetResponse::name).toList();
    }
}
