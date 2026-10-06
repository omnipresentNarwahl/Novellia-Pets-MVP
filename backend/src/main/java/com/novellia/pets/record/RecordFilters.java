package com.novellia.pets.record;

import java.util.Collection;
import java.util.Locale;
import java.util.function.Predicate;

/** Small predicates for filtering a pet's records, each testable on its own. */
public final class RecordFilters {
    private RecordFilters() {
    }

    public static Predicate<MedicalRecord> matchesText(String q) {
        if (q == null || q.isBlank()) {
            return record -> true;
        }
        String needle = q.strip().toLowerCase(Locale.ROOT);
        return record -> contains(record.title(), needle)
                || contains(record.provider(), needle)
                || contains(record.notes(), needle);
    }

    public static Predicate<MedicalRecord> typeIn(Collection<RecordType> types) {
        if (types == null || types.isEmpty()) {
            return record -> true;
        }
        return record -> types.contains(record.type());
    }

    private static boolean contains(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }
}
