package com.ddas.api.dto.response;

import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class AlertResponseDTO {

    private Long id;
    private String uuid;

    // --- Alert Type Info ---
    private Long alertTypeId;
    private String alertTypeCode;
    private String alertTypeName;
    private AlertType.AlertCategory alertTypeCategory;
    private String alertTypeIcon;
    private String alertTypeColor;

    // --- Content ---
    private String title;
    private String titleSi;
    private String titleTa;
    private String message;
    private String messageSi;
    private String messageTa;

    // --- Severity & Source ---
    private AlertType.AlertSeverity severity;
    private Alert.AlertSource source;
    private String sourceSystem;
    private Alert.AlertScope scope;

    // --- Geographic Scope ---
    private Long regionId;
    private String regionName;
    private Long damId;
    private String damName;
    private Long hazardZoneId;

    // --- Location ---
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal radiusKm;

    // --- Hazard Context ---
    private Long hazardLevelId;
    private String hazardLevelName;
    private String hazardLevelColor;
    private BigDecimal riskScore;

    // --- Media & Instructions ---
    private String imageUrl;
    private String actionRequired;
    private String actionRequiredSi;
    private String instructions;
    private String instructionsSi;

    // --- Status ---
    private Alert.AlertStatus status;

    // --- Stats ---
    private Integer recipientCount;
    private Integer deliveredCount;
    private Integer readCount;
    private Integer acknowledgedCount;

    // --- Simulation ---
    private boolean simulationMode;

    // --- Timing ---
    private LocalDateTime issuedAt;
    private LocalDateTime effectiveFrom;
    private LocalDateTime expiresAt;
    private LocalDateTime resolvedAt;

    private String resolutionNotes;
    private Long resolvedBy;

    // --- Audit ---
    private Long createdBy;
    private Long updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
