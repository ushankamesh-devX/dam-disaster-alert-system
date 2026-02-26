package com.ddas.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class CreateSystemSafeLocationRequest {

    @NotBlank
    @Size(max = 36)
    private String uuid;

    @NotBlank
    @Size(max = 50)
    private String code;

    @NotBlank
    @Size(max = 200)
    private String name;

    @Size(max = 200)
    private String nameSi;

    @Size(max = 200)
    private String nameTa;

    private String description;

    private String descriptionSi;

    @NotNull
    private Long locationTypeId;

    private Long regionId;

    @Size(max = 500)
    private String addressText;

    @Size(max = 500)
    private String addressSi;

    @NotNull
    private BigDecimal latitude;

    @NotNull
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

    @Size(max = 120)
    private String contactName;

    @Size(max = 20)
    private String contactPhone;

    @Size(max = 255)
    private String contactEmail;

    @Size(max = 20)
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

    @Size(max = 100)
    private String markerIcon;

    @Size(max = 20)
    private String markerColor;

    @Size(max = 500)
    private String imageUrl;

    private String galleryUrls;

    private Long createdBy;

    private Long updatedBy;
}
