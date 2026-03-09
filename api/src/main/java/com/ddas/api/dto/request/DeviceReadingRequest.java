package com.ddas.api.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Request DTO for ESP32 / IoT device sensor reading submission.
 * Simpler than CreateSensorReadingRequest — sensorId is resolved from the API key.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceReadingRequest {

    @NotNull(message = "Reading value is required")
    private BigDecimal readingValue;

    @Size(max = 20, message = "Unit must be less than 20 characters")
    private String unit;

    private String quality; // good, suspect, bad

    private LocalDateTime recordedAt;

    /**
     * Optional: override sensorId (if device API key is linked to a different sensor).
     * If null, the sensor linked to the API key is used.
     */
    private Long sensorId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchRequest {
        private List<DeviceReadingRequest> readings;
    }
}
