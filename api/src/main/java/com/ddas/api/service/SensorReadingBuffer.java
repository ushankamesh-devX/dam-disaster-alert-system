package com.ddas.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory buffer for sensor readings.
 *
 * ESP32 devices can send data at any rate (e.g. every 100ms).
 * This buffer collects readings per sensor and computes the mean
 * when the configured readingIntervalSeconds has elapsed.
 *
 * <p>Flow:
 * <ol>
 *   <li>Device sends reading → {@link #addReading(Long, BigDecimal, String)}</li>
 *   <li>Check if interval elapsed → {@link #shouldFlush(Long, int, LocalDateTime)}</li>
 *   <li>If yes → {@link #flush(Long)} returns averaged result</li>
 * </ol>
 *
 * <p>Thread safety: Each sensor gets its own {@link SensorBuffer} synchronized independently.
 * The outer ConcurrentHashMap handles concurrent access across different sensors.
 */
@Slf4j
@Component
public class SensorReadingBuffer {

    private final ConcurrentHashMap<Long, SensorBuffer> buffers = new ConcurrentHashMap<>();

    /**
     * Holds buffered readings for a single sensor.
     */
    public static class SensorBuffer {
        private final List<BigDecimal> values = new ArrayList<>();
        private String latestUnit;
        private String latestQuality;
        private LocalDateTime firstReadingAt;
        private LocalDateTime lastReadingAt;

        public synchronized void add(BigDecimal value, String unit, String quality) {
            if (values.isEmpty()) {
                firstReadingAt = LocalDateTime.now();
            }
            values.add(value);
            latestUnit = unit;
            latestQuality = quality;
            lastReadingAt = LocalDateTime.now();
        }

        public synchronized int size() {
            return values.size();
        }

        public synchronized boolean isEmpty() {
            return values.isEmpty();
        }

        public synchronized LocalDateTime getFirstReadingAt() {
            return firstReadingAt;
        }

        public synchronized LocalDateTime getLastReadingAt() {
            return lastReadingAt;
        }

        /**
         * Compute mean of all buffered values, clear buffer, and return the result.
         * Returns null if buffer is empty.
         */
        public synchronized FlushResult computeAndClear() {
            if (values.isEmpty()) {
                return null;
            }

            BigDecimal sum = BigDecimal.ZERO;
            BigDecimal min = values.get(0);
            BigDecimal max = values.get(0);

            for (BigDecimal v : values) {
                sum = sum.add(v);
                if (v.compareTo(min) < 0) min = v;
                if (v.compareTo(max) > 0) max = v;
            }

            BigDecimal mean = sum.divide(BigDecimal.valueOf(values.size()), 4, RoundingMode.HALF_UP);
            int count = values.size();

            FlushResult result = new FlushResult(mean, min, max, count, latestUnit, latestQuality, firstReadingAt, lastReadingAt);

            // Clear buffer for next interval
            values.clear();
            firstReadingAt = null;
            lastReadingAt = null;
            latestUnit = null;
            latestQuality = null;

            return result;
        }
    }

    /**
     * Result of flushing a sensor's buffer — contains the mean value and metadata.
     */
    public record FlushResult(
            BigDecimal meanValue,
            BigDecimal minValue,
            BigDecimal maxValue,
            int readingCount,
            String unit,
            String quality,
            LocalDateTime firstReadingAt,
            LocalDateTime lastReadingAt
    ) {}

    // ============== PUBLIC API ==============

    /**
     * Add a reading value to the buffer for the given sensor.
     *
     * @param sensorId the sensor's database ID
     * @param value    the reading value
     * @param unit     the reading unit (e.g. "meters")
     * @param quality  the reading quality (good/suspect/bad)
     */
    public void addReading(Long sensorId, BigDecimal value, String unit, String quality) {
        SensorBuffer buffer = buffers.computeIfAbsent(sensorId, k -> new SensorBuffer());
        buffer.add(value, unit, quality);
        log.trace("Buffered reading for sensor {}: value={}, buffer size={}", sensorId, value, buffer.size());
    }

    /**
     * Check if the buffer for a sensor should be flushed (interval has elapsed).
     *
     * @param sensorId        the sensor's database ID
     * @param intervalSeconds the configured reading_interval_seconds
     * @param lastReadingAt   the sensor's last_reading_at from the database (last saved reading)
     * @return true if the interval has elapsed and readings should be saved
     */
    public boolean shouldFlush(Long sensorId, int intervalSeconds, LocalDateTime lastReadingAt) {
        SensorBuffer buffer = buffers.get(sensorId);
        if (buffer == null || buffer.isEmpty()) {
            return false;
        }

        // First reading ever (no previous saved reading) → flush immediately
        if (lastReadingAt == null) {
            return true;
        }

        // Check if enough time has passed since the last saved reading
        LocalDateTime flushAfter = lastReadingAt.plusSeconds(intervalSeconds);
        return LocalDateTime.now().isAfter(flushAfter) || LocalDateTime.now().isEqual(flushAfter);
    }

    /**
     * Flush the buffer for a sensor — computes the mean value and clears the buffer.
     *
     * @param sensorId the sensor's database ID
     * @return the flush result with mean/min/max/count, or null if buffer was empty
     */
    public FlushResult flush(Long sensorId) {
        SensorBuffer buffer = buffers.get(sensorId);
        if (buffer == null) {
            return null;
        }

        FlushResult result = buffer.computeAndClear();
        if (result != null) {
            log.info("Flushed buffer for sensor {}: mean={}, count={}, min={}, max={}",
                    sensorId, result.meanValue(), result.readingCount(), result.minValue(), result.maxValue());
        }
        return result;
    }

    /**
     * Get the current buffer size for a sensor (for diagnostics).
     */
    public int getBufferSize(Long sensorId) {
        SensorBuffer buffer = buffers.get(sensorId);
        return buffer != null ? buffer.size() : 0;
    }

    /**
     * Get all sensor IDs that currently have buffered readings.
     * Used by the stale buffer flush scheduler.
     */
    public List<Long> getBufferedSensorIds() {
        List<Long> ids = new ArrayList<>();
        for (Map.Entry<Long, SensorBuffer> entry : buffers.entrySet()) {
            if (!entry.getValue().isEmpty()) {
                ids.add(entry.getKey());
            }
        }
        return ids;
    }

    /**
     * Get the timestamp of the first buffered reading for a sensor.
     * Used to detect stale buffers.
     */
    public LocalDateTime getFirstBufferedReadingAt(Long sensorId) {
        SensorBuffer buffer = buffers.get(sensorId);
        return buffer != null ? buffer.getFirstReadingAt() : null;
    }

    /**
     * Remove a sensor's buffer entirely (e.g. when sensor is deleted).
     */
    public void removeBuffer(Long sensorId) {
        buffers.remove(sensorId);
    }

    /**
     * Get total number of sensors with active buffers (for diagnostics).
     */
    public int getActiveBufferCount() {
        return (int) buffers.values().stream().filter(b -> !b.isEmpty()).count();
    }
}
