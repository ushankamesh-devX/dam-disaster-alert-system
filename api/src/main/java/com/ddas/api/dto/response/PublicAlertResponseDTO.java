package com.ddas.api.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Public Active Alert Response DTO
 *
 * v_active_alerts SQL View-ෙ data-ය Frontend-ට deliver කරයි.
 * Sensitive admin fields exclude කෙරේ — public-safe response.
 *
 * API: GET /api/public/active-alerts
 * Auth: Not required (open endpoint)
 */
@Data
@Builder
public class PublicAlertResponseDTO {

    private Long id;
    private String uuid;

    // Alert core info
    private String title;
    private String message;
    private String severity;      // info | warning | critical | emergency
    private String status;        // active | escalated

    // Dam info
    private Long damId;
    private String damName;
    private String damCode;
    private Double damLatitude;
    private Double damLongitude;

    // Region info
    private Long regionId;
    private String regionName;

    // Alert type
    private String alertTypeCode;
    private String alertTypeName;
    private String alertTypeCategory;

    // Flags
    private boolean simulationMode;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
