package com.novellia.pets.pet;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pets")
public class PetController {
    private final PetService service;

    public PetController(PetService service) {
        this.service = service;
    }

    @GetMapping
    public List<PetResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<Species> species,
            @RequestParam(required = false) String sort) {
        return service.list(q, species, sort);
    }

    @PostMapping
    public ResponseEntity<PetResponse> create(@Valid @RequestBody PetRequest request) {
        PetResponse created = service.create(request);
        return ResponseEntity.created(URI.create("/api/pets/" + created.id())).body(created);
    }

    @GetMapping("/{petId}")
    public PetResponse get(@PathVariable UUID petId) {
        return service.get(petId);
    }

    @PutMapping("/{petId}")
    public PetResponse update(@PathVariable UUID petId, @Valid @RequestBody PetRequest request) {
        return service.update(petId, request);
    }

    @DeleteMapping("/{petId}")
    public ResponseEntity<Void> delete(@PathVariable UUID petId) {
        service.delete(petId);
        return ResponseEntity.noContent().build();
    }
}
