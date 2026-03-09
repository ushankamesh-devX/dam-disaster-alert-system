package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO for device reading submissions.
 * Indicates whether the reading was saved to DB (mean computed) or just buffered.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceReadingResponse {

    /**
     * Whether the reading was actually saved to the database.
     * false = buffered (waiting for interval to elapse)
     * true  = mean was computed and saved
     */
    private boolean saved;

    /**
     * Human-readable message about what happened.
     */
    private String message;

    /**
     * Number of readings currently in the buffer for this sensor.
     */
    private int bufferSize;

    /**
     * The sensor's configured reading interval in seconds.
     * ESP32 can use this to know the server-side interval.
     */
    private int readingIntervalSeconds;

    /**
     * If saved=true, the saved reading details.
     */
    private SavedReading savedReading;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SavedReading {
        private Long id;
        private BigDecimal meanValue;
        private BigDecimal minValue;
        private BigDecimal maxValue;
        private int readingCount;
        private String unit;
        private LocalDateTime recordedAt;
    }
}
