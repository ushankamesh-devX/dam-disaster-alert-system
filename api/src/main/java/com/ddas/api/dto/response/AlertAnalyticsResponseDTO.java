package com.ddas.api.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * Aggregated alert analytics payload for the Admin Dashboard overview widget.
 */
@Data
@Builder
public class AlertAnalyticsResponseDTO {

    /** Total number of alerts ever created (all statuses). */
    private long totalAlerts;

    /** Currently active (live) alert count. */
    private long totalActive;

    /** Total alerts that have been resolved. */
    private long totalResolved;

    /**
     * Active alert count keyed by damId.
     * Example: { 1: 3, 2: 0, 5: 1 }
     */
    private Map<Long, Long> activeAlertsByDam;

    /**
     * Resolution rate (0.0–1.0) per dam — resolved / total for that dam.
     * Example: { 1: 0.75, 2: 1.0 }
     */
    private Map<Long, Double> resolutionRateByDam;
}
