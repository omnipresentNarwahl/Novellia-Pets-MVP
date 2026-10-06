package com.novellia.pets.record;

import com.novellia.pets.common.Strings;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record RecordRequest(
        @NotNull RecordType type,
        @NotBlank @Size(max = 150) String title,
        @NotNull LocalDate recordDate,
        @Size(max = 150) String provider,
        @Size(max = 4000) String notes) {

    public RecordRequest {
        title = Strings.clean(title);
        provider = Strings.clean(provider);
        notes = Strings.clean(notes);
    }
}
