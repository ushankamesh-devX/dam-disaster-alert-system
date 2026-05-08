package com.ddas.api.dto.request;

import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class AlertRequestDTO {

    @NotNull(message = "alertTypeId is required")
    private Long alertTypeId;

    // ── Content ───────────────────────────────────────────────────────────────

    @NotBlank(message = "title is required")
    @Size(max = 255, message = "title must be at most 255 characters")
    private String title;

    @Size(max = 255)
    private String titleSi;

    @Size(max = 255)
    private String titleTa;

    @NotBlank(message = "message is required")
    private String message;

    private String messageSi;
    private String messageTa;

    // ── Classification ────────────────────────────────────────────────────────

    @NotNull(message = "severity is required")
    private AlertType.AlertSeverity severity;

    private Alert.AlertStatus status;

    /** automatic | manual | scheduled | external  (default: manual) */
    private String source;

    /** nationwide | regional | dam_specific | zone_specific  (default: regional) */
    private String scope;

    // ── Geographic ────────────────────────────────────────────────────────────

    private Long damId;
    private Long regionId;
    private Long hazardZoneId;

    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal radiusKm;

    // ── Hazard context ────────────────────────────────────────────────────────

    private Long hazardLevelId;
    private BigDecimal riskScore;

    // ── Instructions ──────────────────────────────────────────────────────────

    @Size(max = 255)
    private String actionRequired;

    @Size(max = 255)
    private String actionRequiredSi;

    private String instructions;
    private String safeLocationIds; // JSON array string

    // ── Media ─────────────────────────────────────────────────────────────────

    @Size(max = 500)
    private String imageUrl;

    // ── Timing ───────────────────────────────────────────────────────────────

    private LocalDateTime issuedAt;
    private LocalDateTime effectiveFrom;
    private LocalDateTime expiresAt;
}
