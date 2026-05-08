package com.ddas.api.dto.request;

import com.ddas.api.entity.AlertType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Payload for a region-targeted alert broadcast.
 * The regionId is supplied via the path variable, not this body.
 */
@Data
public class BroadcastRegionRequestDTO {

    @NotNull(message = "alertTypeId is required")
    private Long alertTypeId;

    @NotBlank(message = "title is required")
    @Size(max = 255)
    private String title;

    @Size(max = 255)
    private String titleSi;

    @NotBlank(message = "message is required")
    private String message;

    private String messageSi;

    @NotNull(message = "severity is required")
    private AlertType.AlertSeverity severity;

    /** Optional — associate the broadcast with a specific dam in the target region */
    private Long damId;

    /** Optional — target a specific hazard zone within the region */
    private Long hazardZoneId;

    @Size(max = 255)
    private String actionRequired;

    @Size(max = 255)
    private String actionRequiredSi;

    private String instructions;

    /** JSON array of system_safe_location IDs to recommend */
    private String safeLocationIds;

    @Size(max = 500)
    private String imageUrl;

    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal radiusKm;

    private LocalDateTime expiresAt;
}
