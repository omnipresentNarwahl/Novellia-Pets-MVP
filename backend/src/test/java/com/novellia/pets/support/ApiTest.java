package com.novellia.pets.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novellia.pets.pet.PetRepository;
import com.novellia.pets.record.RecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Boots the real app with the in-memory repositories and no demo data. */
@SpringBootTest(properties = "app.seed-demo-data=false")
@AutoConfigureMockMvc
public abstract class ApiTest {
    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected PetRepository pets;
    @Autowired protected RecordRepository records;

    @BeforeEach
    void emptyTheStore() {
        records.findAll().forEach(r -> records.deleteById(r.id()));
        pets.findAll().forEach(p -> pets.deleteById(p.id()));
    }

    protected String createPet(String body) throws Exception {
        String response = mvc.perform(post("/api/pets").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asText();
    }

    protected String createPet(String name, String species) throws Exception {
        return createPet("{\"name\":\"%s\",\"species\":\"%s\"}".formatted(name, species));
    }

    protected String createRecord(String petId, String type, String title, String date) throws Exception {
        String body = "{\"type\":\"%s\",\"title\":\"%s\",\"recordDate\":\"%s\"}".formatted(type, title, date);
        String response = mvc.perform(post("/api/pets/" + petId + "/records")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = json.readTree(response);
        return node.get("id").asText();
    }
}
