package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_safe_locations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemSafeLocation {

    public enum Status {
        active,
        inactive,
        under_maintenance,
        full,
        closed
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 36)
    private String uuid;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "name_si", length = 200)
    private String nameSi;

    @Column(name = "name_ta", length = 200)
    private String nameTa;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_si", columnDefinition = "TEXT")
    private String descriptionSi;

    @Column(name = "location_type_id", nullable = false)
    private Long locationTypeId;

    @Column(name = "region_id")
    private Long regionId;

    @Column(name = "address_text", length = 500)
    private String addressText;

    @Column(name = "address_si", length = 500)
    private String addressSi;

    @Column(name = "latitude", precision = 10, scale = 8, nullable = false)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 11, scale = 8, nullable = false)
    private BigDecimal longitude;

    @Column(name = "elevation_meters", precision = 8, scale = 2)
    private BigDecimal elevationMeters;

    @Column(name = "boundary_geojson", columnDefinition = "JSON")
    private String boundaryGeojson;

    @Column(name = "capacity_persons")
    private Integer capacityPersons;

    @Column(name = "current_occupancy")
    private Integer currentOccupancy = 0;

    @Column(name = "has_medical_facility")
    private Boolean hasMedicalFacility = false;

    @Column(name = "has_food_supply")
    private Boolean hasFoodSupply = false;

    @Column(name = "has_water_supply")
    private Boolean hasWaterSupply = false;

    @Column(name = "has_power_backup")
    private Boolean hasPowerBackup = false;

    @Column(name = "has_communication")
    private Boolean hasCommunication = false;

    @Column(name = "has_restrooms")
    private Boolean hasRestrooms = false;

    @Column(name = "has_pet_area")
    private Boolean hasPetArea = false;

    @Column(name = "has_accessibility")
    private Boolean hasAccessibility = false;

    @Column(name = "amenities", columnDefinition = "JSON")
    private String amenities;

    @Column(name = "contact_name", length = 120)
    private String contactName;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    @Column(name = "emergency_phone", length = 20)
    private String emergencyPhone;

    @Column(name = "operating_hours", columnDefinition = "JSON")
    private String operatingHours;

    @Column(name = "is_24_hours")
    private Boolean is24Hours = false;

    @Column(name = "primary_dam_id")
    private Long primaryDamId;

    @Column(name = "serves_hazard_zones", columnDefinition = "JSON")
    private String servesHazardZones;

    @Column(name = "distance_from_dam_km", precision = 8, scale = 2)
    private BigDecimal distanceFromDamKm;

    @Column(name = "estimated_travel_time_minutes")
    private Integer estimatedTravelTimeMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private Status status = Status.active;

    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "last_inspection_date")
    private LocalDate lastInspectionDate;

    @Column(name = "next_inspection_date")
    private LocalDate nextInspectionDate;

    @Column(name = "show_on_map")
    private Boolean showOnMap = true;

    @Column(name = "marker_icon", length = 100)
    private String markerIcon;

    @Column(name = "marker_color", length = 20)
    private String markerColor;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "gallery_urls", columnDefinition = "JSON")
    private String galleryUrls;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
