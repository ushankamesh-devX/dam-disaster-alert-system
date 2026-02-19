package com.ddas.api.dto.request;

import com.ddas.api.entity.Sensor;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSensorRequest {
    @NotBlank(message = "Sensor UID is required")
    @Size(max = 100, message = "Sensor UID must be less than 100 characters")
    private String sensorUid;
    
    @NotNull(message = "Dam ID is required")
    private Long damId;
    
    @NotNull(message = "Sensor type ID is required")
    private Long sensorTypeId;
    
    @NotBlank(message = "Sensor name is required")
    @Size(max = 100, message = "Sensor name must be less than 100 characters")
    private String name;
    
    @Size(max = 500, message = "Description must be less than 500 characters")
    private String description;
    
    @Size(max = 100, message = "Location on dam must be less than 100 characters")
    private String locationOnDam;
    
    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private BigDecimal latitude;
    
    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private BigDecimal longitude;
    
    private BigDecimal elevationMeters;
    
    @Size(max = 100, message = "Manufacturer must be less than 100 characters")
    private String manufacturer;
    
    @Size(max = 100, message = "Model must be less than 100 characters")
    private String model;
    
    @Size(max = 100, message = "Serial number must be less than 100 characters")
    private String serialNumber;
    
    private LocalDate installationDate;
    private LocalDate calibrationDate;
    private LocalDate nextCalibrationDate;
    
    private BigDecimal minReading;
    private BigDecimal maxReading;
    private BigDecimal warningThreshold;
    private BigDecimal criticalThreshold;
    
    @Min(value = 1, message = "Reading interval must be at least 1 second")
    private Integer readingIntervalSeconds;
    
    private Sensor.SensorStatus status;
}
