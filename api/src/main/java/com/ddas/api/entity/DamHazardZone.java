package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dam_hazard_zones")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamHazardZone {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id", nullable = false)
    private Dam dam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hazard_level_id", nullable = false)
    private HazardLevel hazardLevel;

    @Column(name = "zone_code", nullable = false, length = 50)
    private String zoneCode;

    @Column(name = "zone_name", nullable = false, length = 200)
    private String zoneName;

    @Column(name = "zone_name_si", length = 200)
    private String zoneNameSi;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_si", columnDefinition = "TEXT")
    private String descriptionSi;

    @Column(name = "boundary_geojson", nullable = false, columnDefinition = "JSON")
    private String boundaryGeojson;

    @Column(name = "center_latitude", precision = 10, scale = 8)
    private BigDecimal centerLatitude;

    @Column(name = "center_longitude", precision = 11, scale = 8)
    private BigDecimal centerLongitude;

    @Column(name = "area_sq_km", precision = 12, scale = 4)
    private BigDecimal areaSqKm;

    @Column(name = "perimeter_km", precision = 10, scale = 4)
    private BigDecimal perimeterKm;

    @Column(name = "distance_from_dam_km", precision = 8, scale = 2)
    private BigDecimal distanceFromDamKm;

    @Column(name = "estimated_flood_arrival_minutes")
    private Integer estimatedFloodArrivalMinutes;

    @Column(name = "estimated_water_depth_meters", precision = 6, scale = 2)
    private BigDecimal estimatedWaterDepthMeters;

    @Column(name = "flood_velocity_mps", precision = 6, scale = 2)
    private BigDecimal floodVelocityMps;

    @Column(name = "fill_color", length = 20)
    private String fillColor;

    @Column(name = "fill_opacity", precision = 3, scale = 2)
    private BigDecimal fillOpacity;

    @Column(name = "stroke_color", length = 20)
    private String strokeColor;

    @Column(name = "stroke_width")
    private Integer strokeWidth;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Column(name = "show_label")
    private Boolean showLabel = true;

    @Column(name = "label_position", columnDefinition = "JSON")
    private String labelPosition;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

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
}
