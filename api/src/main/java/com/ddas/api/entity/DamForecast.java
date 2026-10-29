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
@Table(name = "dam_forecasts",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_dam_as_of_horizon",
                        columnNames = {"dam_id", "as_of", "horizon_hours"}
                )
        },
        indexes = {
                @Index(name = "idx_forecast_dam_asof", columnList = "dam_id, as_of"),
                @Index(name = "idx_forecast_target_time", columnList = "target_time")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamForecast {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id", nullable = false)
    private Dam dam;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "as_of", nullable = false)
    private LocalDateTime asOf;

    @Column(name = "latest_reading_at")
    private LocalDateTime latestReadingAt;

    @Column(length = 30)
    private String freshness;

    @Column(name = "demo_mode", nullable = false)
    @Builder.Default
    private Boolean demoMode = false;

    @Column(name = "release_id", length = 100)
    private String releaseId;

    @Column(name = "overflow_threshold_meters", precision = 8, scale = 2)
    private BigDecimal overflowThresholdMeters;

    @Column(name = "overflow_config_version")
    private Integer overflowConfigVersion;

    @Column(name = "horizon_hours", nullable = false)
    private Integer horizonHours;

    @Column(name = "target_time", nullable = false)
    private LocalDateTime targetTime;

    @Column(name = "level_p10", precision = 8, scale = 2, nullable = false)
    private BigDecimal levelP10;

    @Column(name = "level_p50", precision = 8, scale = 2, nullable = false)
    private BigDecimal levelP50;

    @Column(name = "level_p90", precision = 8, scale = 2, nullable = false)
    private BigDecimal levelP90;

    @Column(name = "overflow_probability", precision = 6, scale = 4)
    private BigDecimal overflowProbability;

    @Column(name = "overflow_probability_reason", length = 255)
    private String overflowProbabilityReason;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private Boolean isPublished = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
