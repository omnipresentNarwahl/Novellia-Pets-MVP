package com.novellia.pets.dashboard;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.novellia.pets.support.ApiTest;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class DashboardApiTest extends ApiTest {

    @Test
    void emptyDashboard() throws Exception {
        mvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPets").value(0))
                .andExpect(jsonPath("$.totalRecords").value(0))
                .andExpect(jsonPath("$.pets", hasSize(0)));
    }

    @Test
    void dashboardForAKnownDataSet() throws Exception {
        String rex = createPet("Rex", "DOG");
        String zed = createPet("{\"name\":\"Zed\",\"species\":\"OTHER\",\"speciesOther\":\"Ferret\"}");
        createPet("Alpha", "CAT");
        LocalDate today = LocalDate.now();
        createRecord(rex, "VACCINATION", "Rabies", today.minusDays(2).toString());
        createRecord(rex, "VET_VISIT", "Old visit", today.minusDays(90).toString());
        createRecord(zed, "OTHER", "Tank clean", today.minusDays(1).toString());

        mvc.perform(get("/api/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPets").value(3))
                .andExpect(jsonPath("$.totalRecords").value(3))
                .andExpect(jsonPath("$.recordsLast30Days").value(2))
                .andExpect(jsonPath("$.petsBySpecies[?(@.label=='Other')].count").value(1))
                .andExpect(jsonPath("$.recordsByType[?(@.label=='Vaccination')].count").value(1))
                .andExpect(jsonPath("$.pets[*].name").value(org.hamcrest.Matchers.contains("Alpha", "Rex", "Zed")))
                .andExpect(jsonPath("$.pets[2].speciesOther").value("Ferret"))
                .andExpect(jsonPath("$.pets[0].recordCount").value(0))
                .andExpect(jsonPath("$.pets[0].lastRecordDate").doesNotExist())
                .andExpect(jsonPath("$.recentRecords[0].title").value("Tank clean"))
                .andExpect(jsonPath("$.recentRecords[0].petName").value("Zed"))
                .andExpect(jsonPath("$.recentRecords", hasSize(3)));
    }
}
