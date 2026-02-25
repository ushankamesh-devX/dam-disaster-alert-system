package com.ddas.api.dto.request;

import com.ddas.api.entity.Dam;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDamStatusRequest {
    @NotNull(message = "Water level is required")
    @DecimalMin(value = "0", message = "Water level must be positive")
    private BigDecimal waterLevelMeters;
    
    private BigDecimal waterLevelPercentage;
    
    @DecimalMin(value = "0", message = "Inflow must be positive")
    private BigDecimal inflowCumecs;
    
    @DecimalMin(value = "0", message = "Outflow must be positive")
    private BigDecimal outflowCumecs;
    
    @DecimalMin(value = "0", message = "Storage must be positive")
    private BigDecimal storageCurrentMcm;
    
    private BigDecimal storagePercentage;
    
    @Size(max = 50, message = "Spillway gate status must be less than 50 characters")
    private String spillwayGateStatus;
    
    @Min(value = 0, message = "Gates open count must be positive")
    private Integer gatesOpenCount;
    
    private Long currentHazardLevelId;
    
    private Dam.HazardStatus hazardStatus;
    
    @Size(max = 100, message = "Hazard value must be less than 100 characters")
    private String hazardValue;
    
    @DecimalMin(value = "0", message = "Flood risk score must be between 0 and 100")
    @DecimalMax(value = "100", message = "Flood risk score must be between 0 and 100")
    private BigDecimal floodRiskScore;
    
    @DecimalMin(value = "0", message = "Rainfall must be positive")
    private BigDecimal rainfallLast1hrMm;
    
    @DecimalMin(value = "0", message = "Rainfall must be positive")
    private BigDecimal rainfallLast24hrMm;
    
    @DecimalMin(value = "0", message = "Rainfall must be positive")
    private BigDecimal rainfallForecast24hrMm;
}
