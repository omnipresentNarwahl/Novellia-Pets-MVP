package com.novellia.pets.common;

public final class Strings {
    private Strings() {
    }

    /** Trims the value, and turns blank into null. */
    public static String clean(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.strip();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
