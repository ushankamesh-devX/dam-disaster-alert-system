package com.ddas.api.dto.request.report;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignReportRequest {

    @NotNull(message = "assignedToUserId is required")
    private Long assignedToUserId;
}

