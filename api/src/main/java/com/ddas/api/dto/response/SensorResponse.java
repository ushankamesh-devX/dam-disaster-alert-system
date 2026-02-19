package com.ddas.api.dto.response;

import com.ddas.api.entity.Sensor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SensorResponse {
    private Long id;
    private String sensorUid;
    private Long damId;
    private String damName;
    private SensorTypeResponse sensorType;
    private String name;
    private String description;
    private String locationOnDam;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal elevationMeters;
    private String manufacturer;
    private String model;
    private String serialNumber;
    private LocalDate installationDate;
    private LocalDate calibrationDate;
    private LocalDate nextCalibrationDate;
    private BigDecimal minReading;
    private BigDecimal maxReading;
    private BigDecimal warningThreshold;
    private BigDecimal criticalThreshold;
    private Integer readingIntervalSeconds;
    private Sensor.SensorStatus status;
    private LocalDateTime lastReadingAt;
    private BigDecimal batteryLevel;
    private BigDecimal signalStrength;
    private LocalDateTime createdAt;
}
