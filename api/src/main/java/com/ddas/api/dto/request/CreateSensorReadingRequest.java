package com.ddas.api.dto.request;

import com.ddas.api.entity.SensorReading;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSensorReadingRequest {
    @NotNull(message = "Sensor ID is required")
    private Long sensorId;
    
    @NotNull(message = "Reading value is required")
    private BigDecimal readingValue;
    
    @Size(max = 20, message = "Unit must be less than 20 characters")
    private String unit;
    
    private SensorReading.ReadingQuality quality;
    
    private LocalDateTime recordedAt;
}
