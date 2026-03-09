package com.ddas.api.scheduler;

import com.ddas.api.dto.response.DeviceReadingResponse;
import com.ddas.api.service.DeviceApiKeyService;
import com.ddas.api.service.SensorReadingBuffer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled task to flush stale sensor reading buffers.
 *
 * If an ESP32 device stops sending readings (goes offline, loses power, etc.),
 * the last batch of buffered readings would never be flushed and saved.
 * This scheduler detects buffers that haven't received new readings for a while
 * and flushes them so the data isn't lost.
 *
 * Runs every 30 seconds.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StaleBufferFlushScheduler {

    private final SensorReadingBuffer readingBuffer;
    private final DeviceApiKeyService deviceApiKeyService;

    /**
     * Maximum age of a buffer before it's considered stale and force-flushed.
     * Set to 2x the default interval (300s) = 600 seconds = 10 minutes.
     * This ensures we don't flush a buffer that's still actively receiving data
     * from a slow-interval sensor.
     */
    private static final long STALE_THRESHOLD_SECONDS = 600;

    @Scheduled(fixedRate = 30000) // Every 30 seconds
    public void flushStaleBuffers() {
        List<Long> bufferedSensorIds = readingBuffer.getBufferedSensorIds();

        if (bufferedSensorIds.isEmpty()) {
            return; // Nothing to do
        }

        int flushedCount = 0;
        int errorCount = 0;

        for (Long sensorId : bufferedSensorIds) {
            try {
                LocalDateTime firstReadingAt = readingBuffer.getFirstBufferedReadingAt(sensorId);

                if (firstReadingAt == null) {
                    continue; // Buffer was just cleared by another thread
                }

                long ageSeconds = ChronoUnit.SECONDS.between(firstReadingAt, LocalDateTime.now());

                if (ageSeconds >= STALE_THRESHOLD_SECONDS) {
                    log.info("Stale buffer detected for sensor {} (age: {}s), flushing...",
                            sensorId, ageSeconds);

                    DeviceReadingResponse result = deviceApiKeyService.forceFlush(sensorId);

                    if (result != null && result.isSaved()) {
                        flushedCount++;
                        log.info("Stale buffer flushed for sensor {}: mean={}, count={}",
                                sensorId,
                                result.getSavedReading() != null ? result.getSavedReading().getMeanValue() : "N/A",
                                result.getSavedReading() != null ? result.getSavedReading().getReadingCount() : 0);
                    }
                }
            } catch (Exception e) {
                errorCount++;
                log.error("Error flushing stale buffer for sensor {}: {}", sensorId, e.getMessage(), e);
                // Don't rethrow — continue processing other sensors
            }
        }

        if (flushedCount > 0 || errorCount > 0) {
            log.info("Stale buffer flush complete: {} flushed, {} errors, {} still buffered",
                    flushedCount, errorCount, readingBuffer.getActiveBufferCount());
        }
    }
}
