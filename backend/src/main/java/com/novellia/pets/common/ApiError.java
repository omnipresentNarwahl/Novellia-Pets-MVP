package com.novellia.pets.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Map;

/** The one error body every failure uses. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(int status, String message, Map<String, String> errors) {
    public static ApiError of(int status, String message) {
        return new ApiError(status, message, null);
    }
}
