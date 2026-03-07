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

    @NotBlank(message = "title is required")
    @Size(max = 255)
    private String title;

    private String titleSi;
    private String titleTa;

    @NotBlank(message = "message is required")
    private String message;

    private String messageSi;
    private String messageTa;

    @NotNull(message = "severity is required")
    private AlertType.AlertSeverity severity;

    private Alert.AlertSource source;
    private String sourceSystem;
    private Alert.AlertScope scope;

    private Long regionId;
    private Long damId;
    private Long hazardZoneId;

    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal radiusKm;

    private Long hazardLevelId;
    private BigDecimal riskScore;

    private String imageUrl;
    private String actionRequired;
    private String actionRequiredSi;
    private String instructions;
    private String instructionsSi;

    @NotNull(message = "status is required")
    private Alert.AlertStatus status;

    private LocalDateTime issuedAt;
    private LocalDateTime effectiveFrom;
    private LocalDateTime expiresAt;

    private boolean simulationMode;
}
