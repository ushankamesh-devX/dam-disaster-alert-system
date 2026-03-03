package com.ddas.api.dto.request;

import com.ddas.api.entity.AlertType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Payload for a region-targeted alert broadcast.
 * The regionId is supplied via the path variable, not this body.
 */
@Data
public class BroadcastRegionRequestDTO {

    @NotNull(message = "alertTypeId is required")
    private Long alertTypeId;

    @NotBlank(message = "title is required")
    @Size(max = 255, message = "title must be at most 255 characters")
    private String title;

    @NotBlank(message = "message is required")
    private String message;

    @NotNull(message = "severity is required")
    private AlertType.AlertSeverity severity;

    /** Optional. Associate the broadcast with a specific dam in the target region. */
    private Long damId;
}
