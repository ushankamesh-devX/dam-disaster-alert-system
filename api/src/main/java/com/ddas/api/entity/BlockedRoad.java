package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Area that evacuation routes must avoid (flooded road, landslide, bridge out).
 * Drawn by admins on the dashboard; sent to Valhalla as an exclude polygon.
 */
@Entity
@Table(name = "blocked_roads")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockedRoad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String reason;

    /** GeoJSON Polygon or MultiPolygon, [lng, lat] order. */
    @Column(name = "boundary_geojson", nullable = false, columnDefinition = "JSON")
    private String boundaryGeojson;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    /** Optional: the block lifts itself after this time. */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "created_by")
    private Long createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
