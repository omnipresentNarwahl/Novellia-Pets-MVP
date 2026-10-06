package com.novellia.pets.common;

import java.util.Map;

/** A business-rule or parameter failure that maps to a 400 with per-field messages. */
public class ApiValidationException extends RuntimeException {
    private final Map<String, String> errors;

    public ApiValidationException(String field, String message) {
        this(Map.of(field, message));
    }

    public ApiValidationException(Map<String, String> errors) {
        super("Validation failed");
        this.errors = Map.copyOf(errors);
    }

    public Map<String, String> errors() {
        return errors;
    }
}
