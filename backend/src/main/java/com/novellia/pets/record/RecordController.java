package com.novellia.pets.record;

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
@RequestMapping("/api/pets/{petId}/records")
public class RecordController {
    private final RecordService service;

    public RecordController(RecordService service) {
        this.service = service;
    }

    @GetMapping
    public List<RecordResponse> list(
            @PathVariable UUID petId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<RecordType> type,
            @RequestParam(required = false) String sort) {
        return service.list(petId, q, type, sort);
    }

    @PostMapping
    public ResponseEntity<RecordResponse> create(
            @PathVariable UUID petId, @Valid @RequestBody RecordRequest request) {
        RecordResponse created = service.create(petId, request);
        return ResponseEntity.created(URI.create("/api/pets/" + petId + "/records/" + created.id())).body(created);
    }

    @GetMapping("/{recordId}")
    public RecordResponse get(@PathVariable UUID petId, @PathVariable UUID recordId) {
        return service.get(petId, recordId);
    }

    @PutMapping("/{recordId}")
    public RecordResponse update(
            @PathVariable UUID petId, @PathVariable UUID recordId, @Valid @RequestBody RecordRequest request) {
        return service.update(petId, recordId, request);
    }

    @DeleteMapping("/{recordId}")
    public ResponseEntity<Void> delete(@PathVariable UUID petId, @PathVariable UUID recordId) {
        service.delete(petId, recordId);
        return ResponseEntity.noContent().build();
    }
}
