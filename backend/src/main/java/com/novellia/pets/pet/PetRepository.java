package com.novellia.pets.pet;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PetRepository {
    List<Pet> findAll();

    Optional<Pet> findById(UUID id);

    Pet save(Pet pet);

    void deleteById(UUID id);
}
