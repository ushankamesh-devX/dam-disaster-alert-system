package com.ddas.api.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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

    /**
     * Optional: battery level percentage (0-100).
     * If provided, updates the sensor's battery_level.
     */
    @DecimalMin(value = "0", message = "Battery level must be >= 0")
    @DecimalMax(value = "100", message = "Battery level must be <= 100")
    private BigDecimal batteryLevel;

    /**
     * Optional: signal strength in dBm (typically -100 to 0).
     * If provided, updates the sensor's signal_strength.
     */
    @DecimalMin(value = "-100", message = "Signal strength must be >= -100")
    @DecimalMax(value = "0", message = "Signal strength must be <= 0")
    private BigDecimal signalStrength;

    /**
     * Optional: device status (active, inactive, maintenance, faulty, offline).
     * If provided, updates the sensor's status.
     */
    @Size(max = 20, message = "Status must be less than 20 characters")
    private String status;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatchRequest {
        private List<DeviceReadingRequest> readings;
    }
}
