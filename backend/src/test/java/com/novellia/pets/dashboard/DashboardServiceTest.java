package com.novellia.pets.dashboard;

import static org.assertj.core.api.Assertions.assertThat;

import com.novellia.pets.dashboard.DashboardResponse.LabelCount;
import com.novellia.pets.pet.PetRequest;
import com.novellia.pets.pet.PetResponse;
import com.novellia.pets.pet.Species;
import com.novellia.pets.record.RecordRequest;
import com.novellia.pets.record.RecordType;
import com.novellia.pets.support.Fixtures;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class DashboardServiceTest {
    private final Fixtures f = new Fixtures();

    @Test
    void emptyStoreGivesZeros() {
        DashboardResponse d = f.dashboardService.build();
        assertThat(d.totalPets()).isZero();
        assertThat(d.totalRecords()).isZero();
        assertThat(d.recordsLast30Days()).isZero();
        assertThat(d.pets()).isEmpty();
        assertThat(d.recentRecords()).isEmpty();
        assertThat(d.petsBySpecies()).isEmpty();
    }

    @Test
    void countsTotalsBreakdownsAndLast30DaysWithAFixedClock() {
        PetResponse rex = f.petService.create(new PetRequest("rex", Species.DOG, null, null, null, null));
        PetResponse axel = f.petService.create(new PetRequest("Axel", Species.OTHER, "Axolotl", null, null, null));
        PetResponse ferris = f.petService.create(new PetRequest("Ferris", Species.OTHER, "Ferret", null, null, null));
        PetResponse empty = f.petService.create(new PetRequest("Zero", Species.CAT, null, null, null, null));

        add(rex, RecordType.VACCINATION, "v1", Fixtures.TODAY);                 // in window
        add(rex, RecordType.VACCINATION, "v2", Fixtures.TODAY.minusDays(30));   // boundary, in window
        add(rex, RecordType.VET_VISIT, "old", Fixtures.TODAY.minusDays(31));    // out of window
        add(axel, RecordType.OTHER, "water change", Fixtures.TODAY.minusDays(5));
        add(ferris, RecordType.PROCEDURE, "p", Fixtures.TODAY.minusDays(100));

        DashboardResponse d = f.dashboardService.build();

        assertThat(d.totalPets()).isEqualTo(4);
        assertThat(d.totalRecords()).isEqualTo(5);
        assertThat(d.recordsLast30Days()).isEqualTo(3);
        assertThat(d.petsBySpecies()).containsExactly(
                new LabelCount("Dog", 1), new LabelCount("Cat", 1), new LabelCount("Other", 2));
        assertThat(d.recordsByType()).containsExactly(
                new LabelCount("Vaccination", 2), new LabelCount("Vet visit", 1),
                new LabelCount("Procedure", 1), new LabelCount("Other", 1));

        assertThat(d.pets()).extracting(DashboardResponse.PetSummary::name)
                .containsExactly("Axel", "Ferris", "rex", "Zero");
        DashboardResponse.PetSummary rexSummary = d.pets().get(2);
        assertThat(rexSummary.recordCount()).isEqualTo(3);
        assertThat(rexSummary.lastRecordDate()).isEqualTo(Fixtures.TODAY);
        DashboardResponse.PetSummary zero = d.pets().get(3);
        assertThat(zero.recordCount()).isZero();
        assertThat(zero.lastRecordDate()).isNull();
        assertThat(d.pets().get(0).speciesOther()).isEqualTo("Axolotl");

        assertThat(empty.id()).isEqualTo(zero.petId());
    }

    @Test
    void recentRecordsAreTheFiveNewestWithPetNames() {
        PetResponse rex = f.petService.create(new PetRequest("Rex", Species.DOG, null, null, null, null));
        for (int i = 1; i <= 7; i++) {
            add(rex, RecordType.VET_VISIT, "r" + i, Fixtures.TODAY.minusDays(i));
        }
        DashboardResponse d = f.dashboardService.build();
        assertThat(d.recentRecords()).extracting(DashboardResponse.RecentRecord::title)
                .containsExactly("r1", "r2", "r3", "r4", "r5");
        assertThat(d.recentRecords()).allSatisfy(r -> assertThat(r.petName()).isEqualTo("Rex"));
    }

    private void add(PetResponse pet, RecordType type, String title, LocalDate date) {
        f.recordService.create(pet.id(), new RecordRequest(type, title, date, null, null));
    }
}
