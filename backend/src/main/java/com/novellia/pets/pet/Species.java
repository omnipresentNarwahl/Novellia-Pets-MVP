package com.novellia.pets.pet;

public enum Species {
    DOG("Dog"), CAT("Cat"), BIRD("Bird"), RABBIT("Rabbit"), REPTILE("Reptile"), OTHER("Other");

    private final String label;

    Species(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
