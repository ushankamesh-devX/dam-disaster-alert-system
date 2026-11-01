package com.ddas.api.dto.response.ml;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MlStatusResponse {
    private Long id;
    private Long damId;
    private BigDecimal waterLevelMeters;
    private BigDecimal waterLevelPercentage;
    private BigDecimal fullReservoirLevelMeters;
    private BigDecimal dangerLevelMeters;
    private BigDecimal inflowCumecs;
    private BigDecimal outflowCumecs;
    private BigDecimal storageCurrentMcm;
    private BigDecimal storagePercentage;
    private String spillwayGateStatus;
    private Integer gatesOpenCount;
    private Integer totalGatesCount;
    private String hazardStatus;
    private String hazardValue;
    private BigDecimal floodRiskScore;
    private BigDecimal rainfallLast1hrMm;
    private BigDecimal rainfallLast24hrMm;
    private BigDecimal rainfallForecast24hrMm;
    private String lastSensorReadingAt;
    private String lastHazardAssessmentAt;
    private String lastUpdated;
}

