package com.novellia.pets.pet;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryPetRepository implements PetRepository {
    private final Map<UUID, Pet> pets = new ConcurrentHashMap<>();

    @Override
    public List<Pet> findAll() {
        return List.copyOf(pets.values());
    }

    @Override
    public Optional<Pet> findById(UUID id) {
        return Optional.ofNullable(pets.get(id));
    }

    @Override
    public Pet save(Pet pet) {
        pets.put(pet.id(), pet);
        return pet;
    }

    @Override
    public void deleteById(UUID id) {
        pets.remove(id);
    }
}
