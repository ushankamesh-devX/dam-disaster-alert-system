package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dam_current_status")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamCurrentStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id", unique = true, nullable = false)
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
    private Integer gatesOpenCount = 0;

    @Column(name = "total_gates_count")
    private Integer totalGatesCount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_hazard_level_id")
    private HazardLevel currentHazardLevel;

    @Enumerated(EnumType.STRING)
    @Column(name = "hazard_status")
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

    @Column(name = "last_sensor_reading_at")
    private LocalDateTime lastSensorReadingAt;

    @Column(name = "last_hazard_assessment_at")
    private LocalDateTime lastHazardAssessmentAt;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
}
