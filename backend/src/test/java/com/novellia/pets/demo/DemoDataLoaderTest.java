package com.novellia.pets.demo;

import static org.assertj.core.api.Assertions.assertThat;

import com.novellia.pets.dashboard.DashboardResponse;
import com.novellia.pets.dashboard.DashboardService;
import com.novellia.pets.pet.Species;
import com.novellia.pets.steps.StepService;
import com.novellia.pets.steps.StepsResponse;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "app.seed-demo-data=true")
class DemoDataLoaderTest {
    @Autowired DashboardService dashboard;
    @Autowired StepService steps;

    @Test
    void loadsThreePetsWithRecordsCoveringEveryTypeAndAnEmptyPet() {
        DashboardResponse d = dashboard.build();
        assertThat(d.totalPets()).isEqualTo(3);
        assertThat(d.totalRecords()).isEqualTo(8);
        assertThat(d.recordsByType()).hasSize(5);
        assertThat(d.recordsLast30Days()).isPositive();
        assertThat(d.pets()).anyMatch(p -> p.recordCount() == 0);
        assertThat(d.pets()).anyMatch(p -> p.species() == Species.OTHER && p.speciesOther() != null);
    }

    @Test
    void biscuitAndMisoHaveAYearOfStepsAndPancakeHasNone() {
        Map<String, DashboardResponse.PetSummary> byName = dashboard.build().pets().stream()
                .collect(Collectors.toMap(DashboardResponse.PetSummary::name, p -> p));

        assertThat(byName.get("Biscuit").averageDailySteps()).isBetween(5_000L, 20_000L);
        assertThat(byName.get("Miso").averageDailySteps()).isBetween(500L, 5_000L);
        assertThat(byName.get("Pancake").averageDailySteps()).isNull();

        StepsResponse year = steps.daily(byName.get("Biscuit").petId(), StepService.MAX_DAYS);
        assertThat(year.days()).hasSizeGreaterThanOrEqualTo(365);
        assertThat(steps.daily(byName.get("Pancake").petId(), 30).tracked()).isFalse();
    }
}
