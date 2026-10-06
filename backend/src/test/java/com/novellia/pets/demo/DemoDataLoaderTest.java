package com.novellia.pets.demo;

import static org.assertj.core.api.Assertions.assertThat;

import com.novellia.pets.dashboard.DashboardResponse;
import com.novellia.pets.dashboard.DashboardService;
import com.novellia.pets.pet.Species;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "app.seed-demo-data=true")
class DemoDataLoaderTest {
    @Autowired DashboardService dashboard;

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
}
