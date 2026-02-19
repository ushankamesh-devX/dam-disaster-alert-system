package com.ddas.api.dto.response;

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
public class DamHazardZoneResponse {
    private Long id;
    private Long damId;
    private String damName;
    private HazardLevelResponse hazardLevel;
    private String zoneCode;
    private String zoneName;
    private String zoneNameSi;
    private String description;
    private String descriptionSi;
    private String boundaryGeojson;
    private BigDecimal centerLatitude;
    private BigDecimal centerLongitude;
    private BigDecimal areaSqKm;
    private BigDecimal perimeterKm;
    private BigDecimal distanceFromDamKm;
    private Integer estimatedFloodArrivalMinutes;
    private BigDecimal estimatedWaterDepthMeters;
    private BigDecimal floodVelocityMps;
    private String fillColor;
    private BigDecimal fillOpacity;
    private String strokeColor;
    private Integer strokeWidth;
    private Integer displayOrder;
    private Boolean showLabel;
    private String labelPosition;
    private Boolean isActive;
    private Boolean isVerified;
    private LocalDateTime verifiedAt;
    private LocalDateTime createdAt;
}
