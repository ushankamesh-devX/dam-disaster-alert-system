package com.ddas.api.dto.request.report;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateReportStatusRequest {

    @NotBlank(message = "Status is required")
    private String status; // reviewing, in_progress, resolved, rejected, duplicate

    private String notes;

    private String rejectionReason;

    private String resolutionNotes;

    private String resolutionNotesSi;
}
