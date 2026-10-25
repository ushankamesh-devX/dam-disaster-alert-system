package com.ddas.api.dto.response.ml;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MlSensorResponse {
    private Long id;
    private String sensorUid;
    private Long damId;
    private String name;
    private String description;
    private MlSensorTypeResponse sensorType;
    private String unit;
    private String sensorRole;
    private String locationOnDam;
    private BigDecimal elevationMeters;
    private BigDecimal referenceLevelMeters;
    private Boolean isMlFeature;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String manufacturer;
    private String model;
    private String serialNumber;
    private BigDecimal minReading;
    private BigDecimal maxReading;
    private BigDecimal warningThreshold;
    private BigDecimal criticalThreshold;
    private Integer readingIntervalSeconds;
    private String status;
    private String lastReadingAt;
}
