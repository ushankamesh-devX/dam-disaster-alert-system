package com.ddas.api.dto.request.report;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateReportStatusRequest {

    @NotBlank(message = "Status is required")
    private String status;

    private String notes;

    private String rejectionReason;

    private String resolutionNotes;
}

