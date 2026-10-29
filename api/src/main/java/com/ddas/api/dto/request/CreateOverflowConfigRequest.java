package com.ddas.api.dto.request;

import com.ddas.api.entity.DamOverflowConfig.OverflowConfigStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOverflowConfigRequest {

    @NotNull(message = "Verified overflow threshold is required")
    @DecimalMin(value = "0.0", message = "Threshold must be non-negative")
    private BigDecimal thresholdMeters;

    private BigDecimal crestLevelMeters;

    private BigDecimal fullReservoirLevelMeters;

    private BigDecimal dangerLevelMeters;

    private String description;

    @Builder.Default
    private OverflowConfigStatus status = OverflowConfigStatus.verified;

    private LocalDateTime effectiveFrom;
}

