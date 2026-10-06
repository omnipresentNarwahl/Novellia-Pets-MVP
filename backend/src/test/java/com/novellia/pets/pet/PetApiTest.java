package com.novellia.pets.pet;

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

class PetApiTest extends ApiTest {

    @Test
    void createReturns201WithLocationAndTheStoredPet() throws Exception {
        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"  Biscuit ","species":"DOG","breed":"Beagle","dateOfBirth":"2020-05-01","notes":"  "}"""))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/pets/")))
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.name").value("Biscuit"))
                .andExpect(jsonPath("$.species").value("DOG"))
                .andExpect(jsonPath("$.speciesOther").doesNotExist())
                .andExpect(jsonPath("$.notes").doesNotExist())
                .andExpect(jsonPath("$.dateOfBirth").value("2020-05-01"))
                .andExpect(jsonPath("$.recordCount").value(0))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void clientCannotSetIdOrCreatedAt() throws Exception {
        UUID chosen = UUID.randomUUID();
        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"%s\",\"name\":\"X\",\"species\":\"CAT\",\"createdAt\":\"2000-01-01T00:00:00Z\"}".formatted(chosen)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(org.hamcrest.Matchers.not(chosen.toString())))
                .andExpect(jsonPath("$.createdAt").value(org.hamcrest.Matchers.not("2000-01-01T00:00:00Z")));
    }

    @Test
    void getUpdateAndDelete() throws Exception {
        String id = createPet("Biscuit", "DOG");

        mvc.perform(get("/api/pets/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Biscuit"));

        mvc.perform(put("/api/pets/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Biscuit Jr\",\"species\":\"CAT\",\"breed\":\"Siamese\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("Biscuit Jr"))
                .andExpect(jsonPath("$.species").value("CAT"));

        mvc.perform(delete("/api/pets/" + id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/pets/" + id)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/pets/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void validationErrorsReturn400WithFieldMessages() throws Exception {
        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \",\"species\":null,\"breed\":\"" + "b".repeat(101) + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.name").value("must not be blank"))
                .andExpect(jsonPath("$.errors.species").value("must not be null"))
                .andExpect(jsonPath("$.errors.breed").isNotEmpty());
    }

    @Test
    void otherSpeciesNeedsADescriptionButNoOtherSpeciesDoes() throws Exception {
        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Zed\",\"species\":\"OTHER\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.speciesOther").isNotEmpty());

        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Zed\",\"species\":\"OTHER\",\"speciesOther\":\"x\"}".replace("\"x\"", "\"" + "a".repeat(51) + "\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.speciesOther").isNotEmpty());

        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Zed\",\"species\":\"OTHER\",\"speciesOther\":\"Ferret\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.speciesOther").value("Ferret"));
    }

    @Test
    void futureDateOfBirthIsRejected() throws Exception {
        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"species\":\"DOG\",\"dateOfBirth\":\"%s\"}"
                                .formatted(LocalDate.now().plusDays(2))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateOfBirth").isNotEmpty());
    }

    @Test
    void malformedInputReturns400() throws Exception {
        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"species\":\"DRAGON\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.species").isNotEmpty());
        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"species\":\"DOG\",\"dateOfBirth\":\"yesterday\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateOfBirth").isNotEmpty());
        mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON).content("{nope"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Malformed request body"));
        mvc.perform(get("/api/pets/not-a-uuid")).andExpect(status().isBadRequest());
    }

    @Test
    void unknownIdReturns404WithTheSharedErrorBody() throws Exception {
        mvc.perform(get("/api/pets/" + UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Pet not found"))
                .andExpect(jsonPath("$.errors").doesNotExist());
        mvc.perform(put("/api/pets/" + UUID.randomUUID()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"species\":\"DOG\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void unknownPathReturns404AndWrongMethodReturns405() throws Exception {
        mvc.perform(get("/api/nope")).andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));
        mvc.perform(delete("/api/pets")).andExpect(status().isMethodNotAllowed());
    }

    @Test
    void listSearchesFiltersAndSorts() throws Exception {
        createPet("{\"name\":\"Biscuit\",\"species\":\"DOG\",\"breed\":\"Beagle\",\"dateOfBirth\":\"2020-01-01\"}");
        createPet("{\"name\":\"Miso\",\"species\":\"CAT\",\"breed\":\"Siamese\",\"dateOfBirth\":\"2022-01-01\"}");
        createPet("{\"name\":\"Pancake\",\"species\":\"OTHER\",\"speciesOther\":\"Axolotl\"}");

        mvc.perform(get("/api/pets"))
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Biscuit", "Miso", "Pancake")));
        mvc.perform(get("/api/pets").param("q", "siam"))
                .andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].name").value("Miso"));
        mvc.perform(get("/api/pets").param("q", "AXO"))
                .andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].name").value("Pancake"));
        mvc.perform(get("/api/pets").param("species", "DOG", "OTHER"))
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Biscuit", "Pancake")));
        mvc.perform(get("/api/pets").param("sort", "name,desc"))
                .andExpect(jsonPath("$[0].name").value("Pancake"));
        mvc.perform(get("/api/pets").param("sort", "dateOfBirth,desc"))
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Miso", "Biscuit", "Pancake")));
        mvc.perform(get("/api/pets").param("q", "zzz")).andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listRejectsUnknownSortFieldAndUnknownSpecies() throws Exception {
        mvc.perform(get("/api/pets").param("sort", "weight,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.sort").isNotEmpty());
        mvc.perform(get("/api/pets").param("species", "DRAGON"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.species").isNotEmpty());
    }

    @Test
    void deletingAPetRemovesItsRecords() throws Exception {
        String id = createPet("Biscuit", "DOG");
        createRecord(id, "VET_VISIT", "Checkup", "2024-01-01");
        mvc.perform(delete("/api/pets/" + id)).andExpect(status().isNoContent());
        org.assertj.core.api.Assertions.assertThat(records.findAll()).isEmpty();
        mvc.perform(get("/api/pets/" + id + "/records")).andExpect(status().isNotFound());
    }

    @Test
    void petResponseIncludesRecordCountAndLastRecordDate() throws Exception {
        String id = createPet("Biscuit", "DOG");
        createRecord(id, "VET_VISIT", "A", "2024-01-01");
        createRecord(id, "VET_VISIT", "B", "2024-06-01");
        mvc.perform(get("/api/pets/" + id))
                .andExpect(jsonPath("$.recordCount").value(2))
                .andExpect(jsonPath("$.lastRecordDate").value("2024-06-01"));
        mvc.perform(get("/api/pets"))
                .andExpect(jsonPath("$[0].recordCount").value(2));
    }

    @Test
    void dateOfBirthAfterEarliestRecordIsRejectedOnUpdate() throws Exception {
        String id = createPet("Biscuit", "DOG");
        createRecord(id, "VET_VISIT", "A", "2024-01-01");
        mvc.perform(put("/api/pets/" + id).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Biscuit\",\"species\":\"DOG\",\"dateOfBirth\":\"2024-01-02\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.dateOfBirth").isNotEmpty());
    }
}
