package com.ddas.api.dto.response.ml;

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
public class MlForecastResponse {
    private Long id;
    private Long damId;
    private LocalDateTime issuedAt;
    private LocalDateTime asOf;
    private LocalDateTime latestReadingAt;
    private String freshness;
    private Boolean demoMode;
    private String releaseId;
    private BigDecimal overflowThresholdMeters;
    private Integer overflowConfigVersion;
    private Integer horizonHours;
    private LocalDateTime targetTime;
    private BigDecimal levelP10;
    private BigDecimal levelP50;
    private BigDecimal levelP90;
    private BigDecimal overflowProbability;
    private String overflowProbabilityReason;
    private Boolean isPublished;
    private LocalDateTime createdAt;
}

