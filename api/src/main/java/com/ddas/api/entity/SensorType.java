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
@Table(name = "sensor_types")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String unit;

    @Column(name = "min_threshold", precision = 12, scale = 4)
    private BigDecimal minThreshold;

    @Column(name = "max_threshold", precision = 12, scale = 4)
    private BigDecimal maxThreshold;

    @Column(name = "critical_threshold", precision = 12, scale = 4)
    private BigDecimal criticalThreshold;

    @Column(length = 100)
    private String icon;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
