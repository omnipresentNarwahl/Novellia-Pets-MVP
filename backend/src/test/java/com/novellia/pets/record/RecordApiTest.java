package com.novellia.pets.record;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.novellia.pets.support.ApiTest;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class RecordApiTest extends ApiTest {

    @Test
    void createGetUpdateDelete() throws Exception {
        String petId = createPet("Biscuit", "DOG");

        String response = mvc.perform(post("/api/pets/" + petId + "/records").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"VACCINATION","title":" Rabies booster ","recordDate":"2024-03-01",
                                 "provider":"Maple Vet","notes":"Next due 2027"}"""))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/pets/" + petId + "/records/")))
                .andExpect(jsonPath("$.petId").value(petId))
                .andExpect(jsonPath("$.title").value("Rabies booster"))
                .andExpect(jsonPath("$.type").value("VACCINATION"))
                .andReturn().getResponse().getContentAsString();
        String recordId = json.readTree(response).get("id").asText();

        mvc.perform(get("/api/pets/" + petId + "/records/" + recordId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider").value("Maple Vet"));

        mvc.perform(put("/api/pets/" + petId + "/records/" + recordId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"VET_VISIT\",\"title\":\"Checkup\",\"recordDate\":\"2024-04-01\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(recordId))
                .andExpect(jsonPath("$.title").value("Checkup"))
                .andExpect(jsonPath("$.provider").doesNotExist());

        mvc.perform(delete("/api/pets/" + petId + "/records/" + recordId)).andExpect(status().isNoContent());
        mvc.perform(get("/api/pets/" + petId + "/records/" + recordId)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/pets/" + petId + "/records/" + recordId)).andExpect(status().isNotFound());
    }

    @Test
    void validationErrorsReturn400WithFieldMessages() throws Exception {
        String petId = createPet("Biscuit", "DOG");
        mvc.perform(post("/api/pets/" + petId + "/records").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.type").isNotEmpty())
                .andExpect(jsonPath("$.errors.title").isNotEmpty())
                .andExpect(jsonPath("$.errors.recordDate").isNotEmpty());
    }

    @Test
    void futureDateAndDateBeforeBirthAreRejected() throws Exception {
        String petId = createPet("{\"name\":\"Biscuit\",\"species\":\"DOG\",\"dateOfBirth\":\"2020-06-01\"}");
        mvc.perform(post("/api/pets/" + petId + "/records").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OTHER\",\"title\":\"x\",\"recordDate\":\"%s\"}".formatted(LocalDate.now().plusDays(1))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.recordDate").isNotEmpty());
        mvc.perform(post("/api/pets/" + petId + "/records").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OTHER\",\"title\":\"x\",\"recordDate\":\"2020-05-31\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.recordDate").isNotEmpty());
    }

    @Test
    void unknownPetReturns404() throws Exception {
        UUID missing = UUID.randomUUID();
        mvc.perform(post("/api/pets/" + missing + "/records").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OTHER\",\"title\":\"x\",\"recordDate\":\"2024-01-01\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/pets/" + missing + "/records")).andExpect(status().isNotFound());
    }

    @Test
    void recordUnderTheWrongPetReturns404() throws Exception {
        String a = createPet("A", "DOG");
        String b = createPet("B", "CAT");
        String recordId = createRecord(a, "OTHER", "x", "2024-01-01");

        mvc.perform(get("/api/pets/" + b + "/records/" + recordId)).andExpect(status().isNotFound());
        mvc.perform(put("/api/pets/" + b + "/records/" + recordId).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OTHER\",\"title\":\"y\",\"recordDate\":\"2024-01-01\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/pets/" + b + "/records/" + recordId)).andExpect(status().isNotFound());
        mvc.perform(get("/api/pets/" + a + "/records/" + recordId)).andExpect(status().isOk());
    }

    @Test
    void listSearchesFiltersAndSorts() throws Exception {
        String petId = createPet("Biscuit", "DOG");
        createRecord(petId, "VACCINATION", "Rabies booster", "2024-01-01");
        createRecord(petId, "MEDICATION", "Antibiotic", "2024-03-01");
        createRecord(petId, "VET_VISIT", "Checkup", "2024-02-01");
        String base = "/api/pets/" + petId + "/records";

        mvc.perform(get(base)).andExpect(jsonPath("$[*].title").value(contains("Antibiotic", "Checkup", "Rabies booster")));
        mvc.perform(get(base).param("sort", "recordDate,asc"))
                .andExpect(jsonPath("$[*].title").value(contains("Rabies booster", "Checkup", "Antibiotic")));
        mvc.perform(get(base).param("sort", "title,asc"))
                .andExpect(jsonPath("$[*].title").value(contains("Antibiotic", "Checkup", "Rabies booster")));
        mvc.perform(get(base).param("q", "RABIES")).andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get(base).param("type", "VACCINATION", "MEDICATION"))
                .andExpect(jsonPath("$[*].title").value(contains("Antibiotic", "Rabies booster")));
        mvc.perform(get(base).param("q", "zzz")).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listRejectsUnknownSortAndType() throws Exception {
        String petId = createPet("Biscuit", "DOG");
        mvc.perform(get("/api/pets/" + petId + "/records").param("sort", "notes"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.sort").isNotEmpty());
        mvc.perform(get("/api/pets/" + petId + "/records").param("type", "SURGERY"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.errors.type").isNotEmpty());
    }
}
