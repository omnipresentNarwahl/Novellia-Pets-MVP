package com.novellia.pets.steps;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.novellia.pets.support.ApiTest;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class StepApiTest extends ApiTest {

    @Test
    void dailyStepsForATrackedPet() throws Exception {
        String rex = createPet("Rex", "DOG");
        LocalDate today = LocalDate.now();
        for (int i = 0; i < 10; i++) {
            int[] slots = new int[StepRepository.SLOTS_PER_DAY];
            slots[60] = 5000;
            steps.saveDay(UUID.fromString(rex), today.minusDays(i), slots);
        }

        mvc.perform(get("/api/pets/" + rex + "/steps/daily").param("days", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tracked").value(true))
                .andExpect(jsonPath("$.averageLast7Days").value(5000))
                .andExpect(jsonPath("$.days", hasSize(3)))
                .andExpect(jsonPath("$.days[2].date").value(today.toString()))
                .andExpect(jsonPath("$.days[2].steps").value(5000))
                .andExpect(jsonPath("$.days[2].partial").value(true));
    }

    @Test
    void untrackedPetDefaultsToThirtyDaysAndReturnsNoData() throws Exception {
        String miso = createPet("Miso", "CAT");
        mvc.perform(get("/api/pets/" + miso + "/steps/daily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tracked").value(false))
                .andExpect(jsonPath("$.days", hasSize(0)));
    }

    @Test
    void badDaysAndUnknownPets() throws Exception {
        String rex = createPet("Rex", "DOG");
        mvc.perform(get("/api/pets/" + rex + "/steps/daily").param("days", "400"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.days").exists());
        mvc.perform(get("/api/pets/" + UUID.randomUUID() + "/steps/daily"))
                .andExpect(status().isNotFound());
    }
}
