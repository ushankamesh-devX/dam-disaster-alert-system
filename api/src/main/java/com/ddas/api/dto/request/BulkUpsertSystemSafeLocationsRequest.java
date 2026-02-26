package com.ddas.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkUpsertSystemSafeLocationsRequest {

    @NotNull
    @Size(min = 1)
    private List<@Valid UpsertSystemSafeLocationRequest> items;
}
