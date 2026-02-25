package com.ddas.api.dto.request;

import com.ddas.api.entity.Dam;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDamRequest {
    @Size(max = 20, message = "Code must be less than 20 characters")
    private String code;
    
    @Size(max = 200, message = "Name must be less than 200 characters")
    private String name;
    
    @Size(max = 200, message = "Sinhala name must be less than 200 characters")
    private String nameSi;
    
    @Size(max = 200, message = "Tamil name must be less than 200 characters")
    private String nameTa;
    
    private Long regionId;
    
    @Size(max = 500, message = "Location description must be less than 500 characters")
    private String locationDescription;
    
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private BigDecimal latitude;
    
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private BigDecimal longitude;
    
    private Dam.DamType damType;
    
    @DecimalMin(value = "0", message = "Height must be positive")
    private BigDecimal heightMeters;
    
    @DecimalMin(value = "0", message = "Length must be positive")
    private BigDecimal lengthMeters;
    
    @DecimalMin(value = "0", message = "Reservoir capacity must be positive")
    private BigDecimal reservoirCapacityMcm;
    
    @DecimalMin(value = "0", message = "Gross storage must be positive")
    private BigDecimal grossStorageMcm;
    
    @DecimalMin(value = "0", message = "Live storage must be positive")
    private BigDecimal liveStorageMcm;
    
    @DecimalMin(value = "0", message = "Dead storage must be positive")
    private BigDecimal deadStorageMcm;
    
    @DecimalMin(value = "0", message = "Catchment area must be positive")
    private BigDecimal catchmentAreaSqkm;
    
    @DecimalMin(value = "0", message = "Spillway capacity must be positive")
    private BigDecimal spillwayCapacityCumecs;
    
    @Min(value = 1800, message = "Year completed must be valid")
    @Max(value = 2100, message = "Year completed must be valid")
    private Integer yearCompleted;
    
    @Size(max = 100, message = "River name must be less than 100 characters")
    private String riverName;
    
    @Size(max = 255, message = "Purpose must be less than 255 characters")
    private String purpose;
    
    @Size(max = 200, message = "Operator organization must be less than 200 characters")
    private String operatorOrganization;
    
    @Size(max = 20, message = "Contact phone must be less than 20 characters")
    private String contactPhone;
    
    @Size(max = 255, message = "Contact email must be less than 255 characters")
    @Email(message = "Invalid email format")
    private String contactEmail;
    
    @Size(max = 20, message = "Emergency phone must be less than 20 characters")
    private String emergencyPhone;
    
    private Long overallHazardLevelId;
    
    private Dam.DamStatus status;
    
    private Dam.RiskClassification riskClassification;
    
    private LocalDate lastInspectionDate;
    private LocalDate nextInspectionDate;
    
    @Size(max = 500, message = "Image URL must be less than 500 characters")
    private String imageUrl;
    
    private BigDecimal mapCenterLatitude;
    private BigDecimal mapCenterLongitude;
    
    @Min(value = 1, message = "Map zoom must be between 1 and 20")
    @Max(value = 20, message = "Map zoom must be between 1 and 20")
    private Integer mapDefaultZoom;
}
