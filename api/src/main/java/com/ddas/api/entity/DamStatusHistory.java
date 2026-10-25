package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dam_status_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id", nullable = false)
    private Dam dam;

    @Column(name = "water_level_meters", precision = 8, scale = 2)
    private BigDecimal waterLevelMeters;

    @Column(name = "water_level_percentage", precision = 5, scale = 2)
    private BigDecimal waterLevelPercentage;

    @Column(name = "full_reservoir_level_meters", precision = 8, scale = 2)
    private BigDecimal fullReservoirLevelMeters;

    @Column(name = "danger_level_meters", precision = 8, scale = 2)
    private BigDecimal dangerLevelMeters;

    @Column(name = "inflow_cumecs", precision = 10, scale = 2)
    private BigDecimal inflowCumecs;

    @Column(name = "outflow_cumecs", precision = 10, scale = 2)
    private BigDecimal outflowCumecs;

    @Column(name = "storage_current_mcm", precision = 12, scale = 4)
    private BigDecimal storageCurrentMcm;

    @Column(name = "storage_percentage", precision = 5, scale = 2)
    private BigDecimal storagePercentage;

    @Column(name = "spillway_gate_status", columnDefinition = "JSON")
    private String spillwayGateStatus;

    @Column(name = "gates_open_count")
    @Builder.Default
    private Integer gatesOpenCount = 0;

    @Column(name = "total_gates_count")
    private Integer totalGatesCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "hazard_status")
    @Builder.Default
    private Dam.HazardStatus hazardStatus = Dam.HazardStatus.safe;

    @Column(name = "hazard_value", length = 50)
    private String hazardValue;

    @Column(name = "flood_risk_score", precision = 5, scale = 2)
    private BigDecimal floodRiskScore;

    @Column(name = "active_hazard_zones", columnDefinition = "JSON")
    private String activeHazardZones;

    @Column(name = "rainfall_last_1hr_mm", precision = 8, scale = 2)
    private BigDecimal rainfallLast1hrMm;

    @Column(name = "rainfall_last_24hr_mm", precision = 8, scale = 2)
    private BigDecimal rainfallLast24hrMm;

    @Column(name = "rainfall_forecast_24hr_mm", precision = 8, scale = 2)
    private BigDecimal rainfallForecast24hrMm;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}

