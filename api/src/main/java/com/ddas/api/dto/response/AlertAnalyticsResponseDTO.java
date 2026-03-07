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

    /** Total alerts created. */
    private long totalAlerts;

    /** Currently active. */
    private long totalActive;

    /** Total resolved. */
    private long totalResolved;

    /** Total escalated. */
    private long totalEscalated;

    /** Total expired. */
    private long totalExpired;

    /** Total cancelled. */
    private long totalCancelled;

    /** Total draft. */
    private long totalDraft;

    /**
     * Breakdown maps for charts.
     */
    private Map<Long, Long> activeAlertsByDam;
    private Map<Long, Double> resolutionRateByDam;
    
    private Map<String, Long> bySeverity;
    private Map<String, Long> byStatus;
    private Map<String, Long> byCategory;
}
