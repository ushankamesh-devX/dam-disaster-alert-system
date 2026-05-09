package com.ddas.api.dto.request.report;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignReportRequest {

    @NotNull(message = "Assigned user ID is required")
    private Long assignedToUserId;
}
