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
import java.time.Year;
import java.util.Set;

@Entity
@Table(name = "dams")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Dam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 20)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "name_si", length = 150)
    private String nameSi;

    @Column(name = "name_ta", length = 150)
    private String nameTa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @Column(name = "location_description", length = 500)
    private String locationDescription;

    @Column(nullable = false, precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 11, scale = 8)
    private BigDecimal longitude;

    @Enumerated(EnumType.STRING)
    @Column(name = "dam_type", nullable = false)
    private DamType damType;

    @Column(name = "height_meters", precision = 8, scale = 2)
    private BigDecimal heightMeters;

    @Column(name = "length_meters", precision = 10, scale = 2)
    private BigDecimal lengthMeters;

    @Column(name = "reservoir_capacity_mcm", precision = 12, scale = 4)
    private BigDecimal reservoirCapacityMcm;

    @Column(name = "gross_storage_mcm", precision = 12, scale = 4)
    private BigDecimal grossStorageMcm;

    @Column(name = "live_storage_mcm", precision = 12, scale = 4)
    private BigDecimal liveStorageMcm;

    @Column(name = "dead_storage_mcm", precision = 12, scale = 4)
    private BigDecimal deadStorageMcm;

    @Column(name = "catchment_area_sqkm", precision = 10, scale = 2)
    private BigDecimal catchmentAreaSqkm;

    @Column(name = "spillway_capacity_cumecs", precision = 12, scale = 4)
    private BigDecimal spillwayCapacityCumecs;

    @Column(name = "year_completed", columnDefinition = "YEAR")
    private Year yearCompleted;

    @Column(name = "river_name", length = 100)
    private String riverName;

    @Column(nullable = false)
    private String purpose;

    @Column(name = "operator_organization", length = 200)
    private String operatorOrganization;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "emergency_phone", length = 20)
    private String emergencyPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "overall_hazard_level_id")
    private HazardLevel overallHazardLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "overall_hazard_status")
    private HazardStatus overallHazardStatus = HazardStatus.safe;

    @Column(name = "hazard_last_assessed_at")
    private LocalDateTime hazardLastAssessedAt;

    @Column(name = "hazard_assessed_by")
    private Long hazardAssessedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DamStatus status = DamStatus.operational;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_classification")
    private RiskClassification riskClassification = RiskClassification.medium;

    @Column(name = "last_inspection_date")
    private LocalDate lastInspectionDate;

    @Column(name = "next_inspection_date")
    private LocalDate nextInspectionDate;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "map_center_latitude", precision = 10, scale = 8)
    private BigDecimal mapCenterLatitude;

    @Column(name = "map_center_longitude", precision = 11, scale = 8)
    private BigDecimal mapCenterLongitude;

    @Column(name = "map_default_zoom")
    private Integer mapDefaultZoom = 12;

    @Column(name = "dam_boundary_geojson", columnDefinition = "JSON")
    private String damBoundaryGeojson;

    @Column(name = "reservoir_boundary_geojson", columnDefinition = "JSON")
    private String reservoirBoundaryGeojson;

    @Column(name = "downstream_river_geojson", columnDefinition = "JSON")
    private String downstreamRiverGeojson;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum DamType {
        earth, gravity, arch, buttress, embankment, composite
    }

    public enum DamStatus {
        operational, under_maintenance, under_construction, decommissioned
    }

    public enum HazardStatus {
        safe, low, moderate, high, severe, critical
    }

    public enum RiskClassification {
        low, medium, high, very_high
    }
}
