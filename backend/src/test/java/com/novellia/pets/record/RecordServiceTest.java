package com.novellia.pets.record;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.novellia.pets.common.ApiValidationException;
import com.novellia.pets.common.NotFoundException;
import com.novellia.pets.pet.PetRequest;
import com.novellia.pets.pet.PetResponse;
import com.novellia.pets.pet.Species;
import com.novellia.pets.support.Fixtures;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RecordServiceTest {
    private final Fixtures f = new Fixtures();
    private PetResponse pet;

    @BeforeEach
    void setUp() {
        pet = f.petService.create(new PetRequest("Rex", Species.DOG, null, null, LocalDate.of(2020, 3, 1), null));
    }

    private RecordRequest req(String title, LocalDate date) {
        return new RecordRequest(RecordType.VET_VISIT, title, date, null, null);
    }

    @Test
    void recordDateCannotBeInTheFuture() {
        assertThatThrownBy(() -> f.recordService.create(pet.id(), req("x", Fixtures.TODAY.plusDays(1))))
                .isInstanceOfSatisfying(ApiValidationException.class,
                        e -> assertThat(e.errors()).containsKey("recordDate"));
        assertThat(f.recordService.create(pet.id(), req("x", Fixtures.TODAY)).recordDate()).isEqualTo(Fixtures.TODAY);
    }

    @Test
    void recordDateCannotBeBeforeDateOfBirth() {
        assertThatThrownBy(() -> f.recordService.create(pet.id(), req("x", LocalDate.of(2020, 2, 29))))
                .isInstanceOfSatisfying(ApiValidationException.class,
                        e -> assertThat(e.errors().get("recordDate")).contains("2020-03-01"));
        assertThat(f.recordService.create(pet.id(), req("x", LocalDate.of(2020, 3, 1)))).isNotNull();
    }

    @Test
    void recordDateIsUnrestrictedAtTheLowEndWhenBirthdateUnknown() {
        PetResponse rescue = f.petService.create(new PetRequest("Stray", Species.CAT, null, null, null, null));
        assertThat(f.recordService.create(rescue.id(), req("x", LocalDate.of(1999, 1, 1)))).isNotNull();
    }

    @Test
    void updateChecksDatesToo() {
        RecordResponse created = f.recordService.create(pet.id(), req("x", LocalDate.of(2024, 1, 1)));
        assertThatThrownBy(() -> f.recordService.update(pet.id(), created.id(), req("x", Fixtures.TODAY.plusDays(1))))
                .isInstanceOf(ApiValidationException.class);
    }

    @Test
    void updateKeepsIdPetAndCreatedAt() {
        RecordResponse created = f.recordService.create(pet.id(), req("old", LocalDate.of(2024, 1, 1)));
        RecordResponse updated = f.recordService.update(pet.id(), created.id(), req("new", LocalDate.of(2024, 2, 1)));
        assertThat(updated.id()).isEqualTo(created.id());
        assertThat(updated.petId()).isEqualTo(pet.id());
        assertThat(updated.createdAt()).isEqualTo(created.createdAt());
        assertThat(updated.title()).isEqualTo("new");
    }

    @Test
    void recordUnderTheWrongPetIsNotFound() {
        PetResponse other = f.petService.create(new PetRequest("Other", Species.CAT, null, null, null, null));
        RecordResponse created = f.recordService.create(pet.id(), req("x", Fixtures.TODAY));

        assertThatThrownBy(() -> f.recordService.get(other.id(), created.id())).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> f.recordService.update(other.id(), created.id(), req("y", Fixtures.TODAY)))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> f.recordService.delete(other.id(), created.id())).isInstanceOf(NotFoundException.class);
        assertThat(f.records.findById(created.id())).isPresent();
    }

    @Test
    void unknownPetIsNotFound() {
        assertThatThrownBy(() -> f.recordService.create(UUID.randomUUID(), req("x", Fixtures.TODAY)))
                .isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> f.recordService.list(UUID.randomUUID(), null, null, null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void searchMatchesTitleProviderAndNotesAndFiltersByType() {
        f.recordService.create(pet.id(), new RecordRequest(RecordType.VACCINATION, "Rabies booster", LocalDate.of(2024, 1, 1), "Maple Vet", null));
        f.recordService.create(pet.id(), new RecordRequest(RecordType.MEDICATION, "Antibiotic", LocalDate.of(2024, 2, 1), null, "Take with FOOD"));
        f.recordService.create(pet.id(), new RecordRequest(RecordType.PROCEDURE, "Dental", LocalDate.of(2024, 3, 1), null, null));

        assertThat(titles(f.recordService.list(pet.id(), "RABIES", null, null))).containsExactly("Rabies booster");
        assertThat(titles(f.recordService.list(pet.id(), "maple", null, null))).containsExactly("Rabies booster");
        assertThat(titles(f.recordService.list(pet.id(), "food", null, null))).containsExactly("Antibiotic");
        assertThat(titles(f.recordService.list(pet.id(), null, List.of(RecordType.PROCEDURE, RecordType.MEDICATION), null)))
                .containsExactly("Dental", "Antibiotic");
        assertThat(titles(f.recordService.list(pet.id(), "a", List.of(RecordType.MEDICATION), null)))
                .containsExactly("Antibiotic");
    }

    @Test
    void sortsByDateTypeAndTitle() {
        f.recordService.create(pet.id(), new RecordRequest(RecordType.VET_VISIT, "banana", LocalDate.of(2024, 1, 1), null, null));
        f.recordService.create(pet.id(), new RecordRequest(RecordType.MEDICATION, "Cherry", LocalDate.of(2024, 3, 1), null, null));
        f.recordService.create(pet.id(), new RecordRequest(RecordType.VACCINATION, "apple", LocalDate.of(2024, 2, 1), null, null));

        assertThat(titles(f.recordService.list(pet.id(), null, null, null))).containsExactly("Cherry", "apple", "banana");
        assertThat(titles(f.recordService.list(pet.id(), null, null, "recordDate,asc"))).containsExactly("banana", "apple", "Cherry");
        assertThat(titles(f.recordService.list(pet.id(), null, null, "title,asc"))).containsExactly("apple", "banana", "Cherry");
        assertThat(titles(f.recordService.list(pet.id(), null, null, "type,asc"))).containsExactly("Cherry", "apple", "banana");
        assertThatThrownBy(() -> f.recordService.list(pet.id(), null, null, "provider"))
                .isInstanceOf(ApiValidationException.class);
    }

    private static List<String> titles(List<RecordResponse> records) {
        return records.stream().map(RecordResponse::title).toList();
    }
}
