package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Precomputed evacuation route from a hazard zone's center to its best shelter,
 * downloaded by the mobile app so it still has a route with no internet.
 */
@Entity
@Table(name = "evacuation_route_packs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"hazard_zone_id", "mode"}))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvacuationRoutePack {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hazard_zone_id", nullable = false)
    private Long hazardZoneId;

    /** walk or drive */
    @Column(nullable = false, length = 10)
    private String mode;

    /** Same JSON shape as POST /api/public/evacuation/route. */
    @Column(name = "route_json", nullable = false, columnDefinition = "LONGTEXT")
    private String routeJson;

    @Column(name = "computed_at", nullable = false)
    private LocalDateTime computedAt;
}
