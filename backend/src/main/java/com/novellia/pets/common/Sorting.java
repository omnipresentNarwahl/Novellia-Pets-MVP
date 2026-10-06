package com.novellia.pets.common;

import java.util.Comparator;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;

/** Parses "field,direction" sort parameters against an allow list of sortable fields. */
public final class Sorting {
    private Sorting() {
    }

    /** A sortable field. The tie-break always keeps its own direction so the order stays deterministic. */
    public interface Field<T> {
        Comparator<T> comparator(boolean descending);
    }

    public static <T> Field<T> by(Comparator<T> primary, Comparator<T> tieBreak) {
        return descending -> (descending ? primary.reversed() : primary).thenComparing(tieBreak);
    }

    /** Like {@link #by} for a nullable key: nulls sort last in both directions. */
    public static <T, U extends Comparable<? super U>> Field<T> byNullsLast(
            Function<T, U> key, Comparator<T> tieBreak) {
        return descending -> {
            Comparator<U> order = descending ? Comparator.<U>reverseOrder() : Comparator.<U>naturalOrder();
            return Comparator.comparing(key, Comparator.nullsLast(order)).thenComparing(tieBreak);
        };
    }

    public static <T> Comparator<T> parse(String sort, String defaultSort, Map<String, Field<T>> allowed) {
        String value = sort == null || sort.isBlank() ? defaultSort : sort.strip();
        String[] parts = value.split(",", -1);
        Field<T> field = parts.length <= 2 ? allowed.get(parts[0].strip()) : null;
        if (field == null) {
            throw new ApiValidationException("sort", "must be one of: " + String.join(", ", allowed.keySet()));
        }
        String direction = parts.length == 2 ? parts[1].strip().toLowerCase(Locale.ROOT) : "asc";
        return switch (direction) {
            case "asc" -> field.comparator(false);
            case "desc" -> field.comparator(true);
            default -> throw new ApiValidationException("sort", "direction must be asc or desc");
        };
    }
}
