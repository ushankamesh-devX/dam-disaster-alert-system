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
@Table(name = "sensors")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Sensor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sensor_uid", unique = true, nullable = false, length = 100)
    private String sensorUid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id", nullable = false)
    private Dam dam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sensor_type_id", nullable = false)
    private SensorType sensorType;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "location_on_dam", length = 200)
    private String locationOnDam;

    @Column(precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "elevation_meters", precision = 8, scale = 2)
    private BigDecimal elevationMeters;

    @Column(length = 100)
    private String manufacturer;

    @Column(length = 100)
    private String model;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "installation_date")
    private LocalDate installationDate;

    @Column(name = "calibration_date")
    private LocalDate calibrationDate;

    @Column(name = "next_calibration_date")
    private LocalDate nextCalibrationDate;

    @Column(name = "min_reading", precision = 12, scale = 4)
    private BigDecimal minReading;

    @Column(name = "max_reading", precision = 12, scale = 4)
    private BigDecimal maxReading;

    @Column(name = "warning_threshold", precision = 12, scale = 4)
    private BigDecimal warningThreshold;

    @Column(name = "critical_threshold", precision = 12, scale = 4)
    private BigDecimal criticalThreshold;

    @Column(name = "reading_interval_seconds")
    private Integer readingIntervalSeconds = 300;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SensorStatus status = SensorStatus.active;

    @Column(name = "last_reading_at")
    private LocalDateTime lastReadingAt;

    @Column(name = "battery_level", precision = 5, scale = 2)
    private BigDecimal batteryLevel;

    @Column(name = "signal_strength", precision = 5, scale = 2)
    private BigDecimal signalStrength;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum SensorStatus {
        active, inactive, maintenance, faulty, offline
    }
}
