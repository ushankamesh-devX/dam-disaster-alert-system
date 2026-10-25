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
@Table(name = "dam_overflow_configs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamOverflowConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id", nullable = false)
    private Dam dam;

    @Column(nullable = false)
    private Integer version;

    @Column(name = "threshold_meters", precision = 8, scale = 2, nullable = false)
    private BigDecimal thresholdMeters;

    @Column(name = "crest_level_meters", precision = 8, scale = 2)
    private BigDecimal crestLevelMeters;

    @Column(name = "full_reservoir_level_meters", precision = 8, scale = 2)
    private BigDecimal fullReservoirLevelMeters;

    @Column(name = "danger_level_meters", precision = 8, scale = 2)
    private BigDecimal dangerLevelMeters;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private OverflowConfigStatus status = OverflowConfigStatus.verified;

    @Column(name = "verified_by")
    private Long verifiedBy;

    @Column(name = "effective_from", nullable = false)
    private LocalDateTime effectiveFrom;

    @Column(name = "effective_to")
    private LocalDateTime effectiveTo;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum OverflowConfigStatus {
        verified, pending_verification, deprecated
    }
}

