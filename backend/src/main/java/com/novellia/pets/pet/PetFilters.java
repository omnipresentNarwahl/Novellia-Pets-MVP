package com.novellia.pets.pet;

import java.util.Collection;
import java.util.Locale;
import java.util.function.Predicate;

/** Small predicates for filtering pets, each testable on its own. */
public final class PetFilters {
    private PetFilters() {
    }

    public static Predicate<Pet> matchesText(String q) {
        if (q == null || q.isBlank()) {
            return pet -> true;
        }
        String needle = q.strip().toLowerCase(Locale.ROOT);
        return pet -> contains(pet.name(), needle)
                || contains(pet.breed(), needle)
                || contains(pet.speciesOther(), needle);
    }

    public static Predicate<Pet> speciesIn(Collection<Species> species) {
        if (species == null || species.isEmpty()) {
            return pet -> true;
        }
        return pet -> species.contains(pet.species());
    }

    private static boolean contains(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }
}
