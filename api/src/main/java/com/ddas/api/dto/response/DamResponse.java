package com.ddas.api.dto.response;

import com.ddas.api.entity.Dam;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamResponse {
    private Long id;
    private String code;
    private String name;
    private String nameSi;
    private String nameTa;
    private RegionResponse region;
    private String locationDescription;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Dam.DamType damType;
    private BigDecimal heightMeters;
    private BigDecimal lengthMeters;
    private BigDecimal reservoirCapacityMcm;
    private BigDecimal grossStorageMcm;
    private BigDecimal liveStorageMcm;
    private BigDecimal deadStorageMcm;
    private BigDecimal catchmentAreaSqkm;
    private BigDecimal spillwayCapacityCumecs;
    private Integer yearCompleted;
    private String riverName;
    private String purpose;
    private String operatorOrganization;
    private String contactPhone;
    private String contactEmail;
    private String emergencyPhone;
    private HazardLevelResponse overallHazardLevel;
    private Dam.HazardStatus overallHazardStatus;
    private LocalDateTime hazardLastAssessedAt;
    private Dam.DamStatus status;
    private Dam.RiskClassification riskClassification;
    private LocalDate lastInspectionDate;
    private LocalDate nextInspectionDate;
    private String imageUrl;
    private BigDecimal mapCenterLatitude;
    private BigDecimal mapCenterLongitude;
    private Integer mapDefaultZoom;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
