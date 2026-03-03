package com.ddas.api.dto.request;

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
public class CreateHazardZoneRequest {
    @NotNull(message = "Dam ID is required")
    private Long damId;
    
    @NotNull(message = "Hazard level ID is required")
    private Long hazardLevelId;
    
    @NotBlank(message = "Zone code is required")
    @Size(max = 50, message = "Zone code must be less than 50 characters")
    private String zoneCode;
    
    @NotBlank(message = "Zone name is required")
    @Size(max = 200, message = "Zone name must be less than 200 characters")
    private String zoneName;
    
    @Size(max = 200, message = "Zone name (Sinhala) must be less than 200 characters")
    private String zoneNameSi;
    
    @Size(max = 500, message = "Description must be less than 500 characters")
    private String description;
    
    @Size(max = 500, message = "Description (Sinhala) must be less than 500 characters")
    private String descriptionSi;
    
    private String boundaryGeojson;
    
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private BigDecimal centerLatitude;
    
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private BigDecimal centerLongitude;
    
    @DecimalMin(value = "0", message = "Area must be positive")
    private BigDecimal areaSqKm;
    
    @DecimalMin(value = "0", message = "Perimeter must be positive")
    private BigDecimal perimeterKm;
    
    @DecimalMin(value = "0", message = "Distance from dam must be positive")
    private BigDecimal distanceFromDamKm;
    
    @Min(value = 0, message = "Estimated flood arrival must be positive")
    private Integer estimatedFloodArrivalMinutes;
    
    @DecimalMin(value = "0", message = "Estimated water depth must be positive")
    private BigDecimal estimatedWaterDepthMeters;
    
    @DecimalMin(value = "0", message = "Flood velocity must be positive")
    private BigDecimal floodVelocityMps;
    
    @Size(max = 20, message = "Fill color must be less than 20 characters")
    private String fillColor;
    
    @DecimalMin(value = "0", message = "Fill opacity must be between 0 and 1")
    @DecimalMax(value = "1", message = "Fill opacity must be between 0 and 1")
    private BigDecimal fillOpacity;
    
    @Size(max = 20, message = "Stroke color must be less than 20 characters")
    private String strokeColor;
    
    @Min(value = 0, message = "Stroke width must be positive")
    private Integer strokeWidth;
    
    private Integer displayOrder;
    private Boolean showLabel;
    
    @Size(max = 20, message = "Label position must be less than 20 characters")
    private String labelPosition;
    
    private Boolean isActive;
}
