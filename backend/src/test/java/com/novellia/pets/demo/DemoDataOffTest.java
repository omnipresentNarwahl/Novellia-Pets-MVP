package com.novellia.pets.demo;

import static org.assertj.core.api.Assertions.assertThat;

import com.novellia.pets.pet.PetRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "app.seed-demo-data=false")
class DemoDataOffTest {
    @Autowired PetRepository pets;

    @Test
    void startsEmptyWhenTheFlagIsOff() {
        assertThat(pets.findAll()).isEmpty();
    }
}
