package com.novellia.pets.steps;

import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pets/{petId}/steps")
public class StepController {
    private final StepService service;

    public StepController(StepService service) {
        this.service = service;
    }

    @GetMapping("/daily")
    public StepsResponse daily(@PathVariable UUID petId, @RequestParam(defaultValue = "30") int days) {
        return service.daily(petId, days);
    }
}
