package com.novellia.pets.record;

public enum RecordType {
    VACCINATION("Vaccination"), VET_VISIT("Vet visit"), MEDICATION("Medication"), PROCEDURE("Procedure"), OTHER("Other");

    private final String label;

    RecordType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
