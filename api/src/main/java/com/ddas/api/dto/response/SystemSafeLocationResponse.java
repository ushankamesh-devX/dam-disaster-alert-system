package com.ddas.api.dto.response;

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
public class SystemSafeLocationResponse {

    private Long id;
    private String uuid;
    private String code;
    private String name;
    private String nameSi;
    private String nameTa;
    private String description;
    private String descriptionSi;
    private Long locationTypeId;
    private Long regionId;
    private String addressText;
    private String addressSi;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal elevationMeters;
    private String boundaryGeojson;
    private Integer capacityPersons;
    private Integer currentOccupancy;
    private Boolean hasMedicalFacility;
    private Boolean hasFoodSupply;
    private Boolean hasWaterSupply;
    private Boolean hasPowerBackup;
    private Boolean hasCommunication;
    private Boolean hasRestrooms;
    private Boolean hasPetArea;
    private Boolean hasAccessibility;
    private String amenities;
    private String contactName;
    private String contactPhone;
    private String contactEmail;
    private String emergencyPhone;
    private String operatingHours;
    private Boolean is24Hours;
    private Long primaryDamId;
    private String servesHazardZones;
    private BigDecimal distanceFromDamKm;
    private Integer estimatedTravelTimeMinutes;
    private String status;
    private Boolean isVerified;
    private Long verifiedBy;
    private LocalDateTime verifiedAt;
    private LocalDate lastInspectionDate;
    private LocalDate nextInspectionDate;
    private Boolean showOnMap;
    private String markerIcon;
    private String markerColor;
    private String imageUrl;
    private String galleryUrls;
    private Long createdBy;
    private Long updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
}
