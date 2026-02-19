package com.ddas.api.dto.response;

import com.ddas.api.entity.Dam;
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
public class DamCurrentStatusResponse {
    private Long id;
    private Long damId;
    private String damName;
    private String damCode;
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
    private HazardLevelResponse currentHazardLevel;
    private Dam.HazardStatus hazardStatus;
    private String hazardValue;
    private BigDecimal floodRiskScore;
    private String activeHazardZones;
    private BigDecimal rainfallLast1hrMm;
    private BigDecimal rainfallLast24hrMm;
    private BigDecimal rainfallForecast24hrMm;
    private LocalDateTime lastSensorReadingAt;
    private LocalDateTime lastHazardAssessmentAt;
    private LocalDateTime lastUpdated;
}
