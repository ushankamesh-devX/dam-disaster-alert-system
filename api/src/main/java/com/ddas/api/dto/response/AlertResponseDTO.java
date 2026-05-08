package com.ddas.api.dto.response;

import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Full alert response DTO — mirrors the alerts + alert_types DB join.
 * Used by the mobile app Alerts screen and the Admin dashboard.
 */
@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AlertResponseDTO {

    // ── Identity ──────────────────────────────────────────────────────────────
    private Long id;
    private String uuid;

    // ── Alert type ────────────────────────────────────────────────────────────
    private Long alertTypeId;
    private String alertTypeCode;
    private String alertTypeName;
    private String alertTypeNameSi;
    private String alertTypeCategory;
    /** Icon name for MaterialCommunityIcons in the mobile app */
    private String alertTypeIcon;
    /** Hex colour string — e.g. '#EF4444' */
    private String alertTypeColor;
    private boolean requiresAcknowledgment;

    // ── Content ───────────────────────────────────────────────────────────────
    private String title;
    private String titleSi;
    private String titleTa;
    private String message;
    private String messageSi;
    private String messageTa;

    // ── Classification ────────────────────────────────────────────────────────
    private AlertType.AlertSeverity severity;
    private Alert.AlertStatus status;
    private String source;
    private String scope;

    // ── Geographic ────────────────────────────────────────────────────────────
    private Long damId;
    private Long regionId;
    private Long hazardZoneId;
    private String affectedZones;     // JSON string
    private String affectedRegions;   // JSON string
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal radiusKm;

    // ── Hazard context ────────────────────────────────────────────────────────
    private Long hazardLevelId;
    private BigDecimal riskScore;

    // ── Instructions ──────────────────────────────────────────────────────────
    private String actionRequired;
    private String actionRequiredSi;
    private String instructions;
    private String safeLocationIds;   // JSON string

    // ── Media ─────────────────────────────────────────────────────────────────
    private String imageUrl;

    // ── Timing ────────────────────────────────────────────────────────────────
    private LocalDateTime issuedAt;
    private LocalDateTime effectiveFrom;
    private LocalDateTime expiresAt;
    private LocalDateTime resolvedAt;
    private String resolutionNotes;

    // ── Stats ─────────────────────────────────────────────────────────────────
    private int recipientCount;
    private int deliveredCount;
    private int readCount;
    private int acknowledgedCount;

    // ── Flags ─────────────────────────────────────────────────────────────────
    private boolean simulationMode;

    // ── Audit ─────────────────────────────────────────────────────────────────
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
