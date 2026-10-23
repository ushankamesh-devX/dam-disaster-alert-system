package com.ddas.api.service;

import com.ddas.api.entity.Sensor;
import com.ddas.api.entity.SensorReading;
import com.ddas.api.repository.SensorReadingRepository;
import com.ddas.api.repository.SensorRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.IMqttMessageListener;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * MQTT Subscriber Service — DDAS Sensor Data Ingestion
 *
 * Mosquitto broker හි MQTT topics subscribe කර:
 *   1. ESP32 sensor readings receive කරයි
 *   2. Sensor UID මගින් DB-ය validate කරයි
 *   3. SensorReadingBuffer හරහා mean value save කරයි
 *   4. Sensor status (LWT) updates handle කරයි
 *
 * Subscribe Topics:
 *   ddas/sensors/+/readings  ← ESP32 water level data
 *   ddas/sensors/+/status    ← ESP32 device health / LWT offline
 *
 * ← ඔබේ example: MqttSubscriber.java
 *   - Same brokerUrl, topic subscribe, ObjectMapper pattern
 *   - com.ddas.api package structure + existing SensorReadingBuffer integrate කළා
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MqttSubscriberService {

    // ── Injected Dependencies ──────────────────────────────────────────────
    private final MqttClient              mqttClient;           // MqttConfig @Bean
    private final SensorRepository        sensorRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final SensorReadingBuffer     readingBuffer;        // existing buffer service
    private final ObjectMapper            objectMapper;
    private final HazardAssessmentService hazardAssessmentService; // Step 5: hazard check

    // ── MQTT Config (from application.properties) ─────────────────────────
    @Value("${mqtt.topic.readings:ddas/sensors/+/readings}")
    private String topicReadings;

    @Value("${mqtt.topic.status:ddas/sensors/+/status}")
    private String topicStatus;

    @Value("${mqtt.qos:1}")
    private int qos;

    // ── Lifecycle ──────────────────────────────────────────────────────────

    /**
     * Spring startup හිදී topics subscribe කරයි.
     * ← ඔබේ example: @PostConstruct connectAndSubscribe()
     */
    @PostConstruct
    public void connectAndSubscribe() {
        log.info("[MQTT] Subscribing to topics...");
        try {
            // Subscribe: ddas/sensors/+/readings  (wildcard + = any sensorUid)
            mqttClient.subscribe(topicReadings, qos, readingsListener());
            log.info("[MQTT] Subscribed: {} (QoS {})", topicReadings, qos);

            // Subscribe: ddas/sensors/+/status  (LWT + heartbeat)
            mqttClient.subscribe(topicStatus, qos, statusListener());
            log.info("[MQTT] Subscribed: {} (QoS {})", topicStatus, qos);

        } catch (MqttException e) {
            log.error("[MQTT] Failed to subscribe: {}", e.getMessage(), e);
        }
    }

    /**
     * Spring shutdown හිදී MQTT client disconnect කරයි.
     */
    @PreDestroy
    public void disconnect() {
        try {
            if (mqttClient.isConnected()) {
                mqttClient.disconnect();
                log.info("[MQTT] Client disconnected gracefully.");
            }
        } catch (MqttException e) {
            log.warn("[MQTT] Error during disconnect: {}", e.getMessage());
        }
    }

    // ── Message Listeners ──────────────────────────────────────────────────

    /**
     * READINGS listener.
     * Topic: ddas/sensors/{sensorUid}/readings
     *
     * ← ඔබේ example:
     *   mqttClient.subscribe(topic, (topic, msg) -> {
     *       String payload = new String(msg.getPayload());
     *       ObjectMapper mapper = new ObjectMapper();
     *       SensorReading reading = mapper.readValue(payload, SensorReading.class);
     *       reading.setReceivedAt(LocalDateTime.now());
     *       repository.save(reading);
     *   });
     *
     * Professional version: sensorUid validate + SensorReadingBuffer + threshold check
     */
    private IMqttMessageListener readingsListener() {
        return (topic, message) -> {
            String payload = new String(message.getPayload());
            log.debug("[MQTT] Received reading on {}: {}", topic, payload);

            try {
                // Extract sensorUid from topic: ddas/sensors/{sensorUid}/readings
                String sensorUid = extractSensorUid(topic);
                if (sensorUid == null) {
                    log.warn("[MQTT] Cannot extract sensorUid from topic: {}", topic);
                    return;
                }

                // Parse JSON payload (ඔබේ example: ObjectMapper.readValue)
                JsonNode json = objectMapper.readTree(payload);

                // Sensor DB record lookup (sensorUid → Sensor entity with type eager-loaded)
                Optional<Sensor> sensorOpt = sensorRepository.findBySensorUidWithType(sensorUid);
                if (sensorOpt.isEmpty()) {
                    log.warn("[MQTT] Unknown sensorUid '{}' — not registered in DB. Ignoring.", sensorUid);
                    return;
                }

                Sensor sensor = sensorOpt.get();

                // Skip inactive sensors
                if (sensor.getStatus() == Sensor.SensorStatus.inactive) {
                    log.debug("[MQTT] Sensor {} is inactive. Skipping reading.", sensorUid);
                    return;
                }

                // Extract reading fields from JSON
                BigDecimal readingValue = extractDecimal(json, "readingValue");
                String unit             = extractText(json, "unit", "meters");
                String qualityStr       = extractText(json, "quality", "good");
                BigDecimal batteryLevel = extractDecimal(json, "batteryLevel");
                BigDecimal signalStr    = extractDecimal(json, "signalStrength");

                if (readingValue == null) {
                    log.warn("[MQTT] Missing readingValue in payload from sensor {}", sensorUid);
                    return;
                }

                // qualityStr is passed directly to the buffer; mapQuality used only when flushing to DB

                // ── Buffer the reading (SensorReadingBuffer) ──────────────────
                // SensorReadingBuffer mean value compute කර DB save කරයි
                readingBuffer.addReading(sensor.getId(), readingValue, unit, qualityStr);

                LocalDateTime now = LocalDateTime.now();

                // Check if interval has elapsed → flush + save to DB
                int intervalSeconds = sensor.getReadingIntervalSeconds() != null
                        ? sensor.getReadingIntervalSeconds() : 300;

                if (readingBuffer.shouldFlush(sensor.getId(), intervalSeconds, sensor.getLastReadingAt())) {
                    SensorReadingBuffer.FlushResult result = readingBuffer.flush(sensor.getId());

                    if (result != null) {
                        // ── Save to MySQL (ඔබේ example: repository.save(reading)) ──
                        saveReading(sensor, result, now);

                        // Update sensor metadata
                        updateSensorMetadata(sensor, batteryLevel, signalStr, now);

                        log.info("[MQTT] Saved reading for sensor {}: mean={} {} (from {} samples)",
                                sensorUid, result.meanValue(), unit, result.readingCount());
                    }
                } else {
                    log.debug("[MQTT] Buffered reading for sensor {} (buffer size: {})",
                            sensorUid, readingBuffer.getBufferSize(sensor.getId()));
                }

            } catch (Exception e) {
                log.error("[MQTT] Error processing reading from topic {}: {}", topic, e.getMessage(), e);
            }
        };
    }

    /**
     * STATUS listener.
     * Topic: ddas/sensors/{sensorUid}/status
     *
     * Device online/offline/faulty status DB update කරයි.
     * LWT (Last Will & Testament) offline messages handle කරයි.
     */
    private IMqttMessageListener statusListener() {
        return (topic, message) -> {
            String payload = new String(message.getPayload());
            log.debug("[MQTT] Received status on {}: {}", topic, payload);

            try {
                String sensorUid = extractSensorUid(topic);
                if (sensorUid == null) return;

                JsonNode json = objectMapper.readTree(payload);
                String statusStr = extractText(json, "status", "active");

                Optional<Sensor> sensorOpt = sensorRepository.findBySensorUid(sensorUid);
                if (sensorOpt.isEmpty()) {
                    log.warn("[MQTT] Status for unknown sensorUid: {}", sensorUid);
                    return;
                }

                Sensor sensor = sensorOpt.get();
                Sensor.SensorStatus newStatus = mapSensorStatus(statusStr);

                // Status change occurred
                if (sensor.getStatus() != newStatus) {
                    log.info("[MQTT] Sensor {} status: {} → {}", sensorUid, sensor.getStatus(), newStatus);
                }

                // Update status + battery/signal if present
                sensor.setStatus(newStatus);
                BigDecimal battery = extractDecimal(json, "batteryLevel");
                BigDecimal signal  = extractDecimal(json, "signalStrength");
                if (battery != null) sensor.setBatteryLevel(battery);
                if (signal  != null) sensor.setSignalStrength(signal);

                sensorRepository.save(sensor);
                log.debug("[MQTT] Sensor {} status updated to: {}", sensorUid, newStatus);

            } catch (Exception e) {
                log.error("[MQTT] Error processing status from topic {}: {}", topic, e.getMessage(), e);
            }
        };
    }

    // ── DB Persistence ─────────────────────────────────────────────────────

    /**
     * SensorReading DB-ය save කරයි (flush result mean value).
     * ← ඔබේ example: repository.save(reading)
     */
    @Transactional
    protected void saveReading(Sensor sensor, SensorReadingBuffer.FlushResult result, LocalDateTime receivedAt) {
        SensorReading.ReadingQuality quality = mapQuality(result.quality());

        SensorReading reading = SensorReading.builder()
                .sensor(sensor)
                .dam(sensor.getDam())
                .readingValue(result.meanValue())
                .unit(result.unit())
                .quality(quality)
                .recordedAt(result.lastReadingAt() != null ? result.lastReadingAt() : receivedAt)
                .receivedAt(receivedAt)  // ← ඔබේ example: reading.setReceivedAt(LocalDateTime.now())
                .build();

        sensorReadingRepository.save(reading);

        // ── Step 5: Hazard Assessment ──────────────────────────────────────────
        // Reading save කළ ගමන් danger level check + alert trigger
        try {
            hazardAssessmentService.assessReading(sensor, reading);
        } catch (Exception ex) {
            // Hazard assessment failure must NOT break sensor data ingestion
            log.error("[HAZARD] Assessment failed for sensor {}: {}", sensor.getSensorUid(), ex.getMessage(), ex);
        }
    }

    /**
     * Sensor metadata update: lastReadingAt, batteryLevel, signalStrength.
     */
    @Transactional
    protected void updateSensorMetadata(Sensor sensor, BigDecimal battery,
                                        BigDecimal signal, LocalDateTime now) {
        sensor.setLastReadingAt(now);
        if (battery != null) sensor.setBatteryLevel(battery);
        if (signal  != null) sensor.setSignalStrength(signal);
        if (sensor.getStatus() == Sensor.SensorStatus.offline
                || sensor.getStatus() == Sensor.SensorStatus.faulty) {
            sensor.setStatus(Sensor.SensorStatus.active); // reading ලැබෙනවා → active
        }
        sensorRepository.save(sensor);
    }

    // ── Utility Helpers ─────────────────────────────────────────────────────

    /**
     * MQTT topic string එකෙන් sensorUid extract කරයි.
     * Topic format: ddas/sensors/{sensorUid}/readings
     *                              [2]
     */
    private String extractSensorUid(String topic) {
        String[] parts = topic.split("/");
        if (parts.length >= 3) {
            return parts[2];
        }
        return null;
    }

    private BigDecimal extractDecimal(JsonNode json, String field) {
        JsonNode node = json.get(field);
        if (node != null && !node.isNull()) {
            try {
                return new BigDecimal(node.asText());
            } catch (NumberFormatException e) {
                log.warn("[MQTT] Cannot parse '{}' as BigDecimal from field: {}", node.asText(), field);
            }
        }
        return null;
    }

    private String extractText(JsonNode json, String field, String defaultValue) {
        JsonNode node = json.get(field);
        return (node != null && !node.isNull()) ? node.asText() : defaultValue;
    }

    /**
     * ESP32 quality string → SensorReading.ReadingQuality enum
     */
    private SensorReading.ReadingQuality mapQuality(String qualityStr) {
        if (qualityStr == null) return SensorReading.ReadingQuality.good;
        return switch (qualityStr.toLowerCase()) {
            case "suspect", "critical", "degraded", "error" -> SensorReading.ReadingQuality.suspect;
            case "bad"                                       -> SensorReading.ReadingQuality.bad;
            default                                          -> SensorReading.ReadingQuality.good;
        };
    }

    /**
     * ESP32 status string → Sensor.SensorStatus enum
     */
    private Sensor.SensorStatus mapSensorStatus(String status) {
        if (status == null) return Sensor.SensorStatus.active;
        return switch (status.toLowerCase()) {
            case "offline"     -> Sensor.SensorStatus.offline;
            case "faulty"      -> Sensor.SensorStatus.faulty;
            case "maintenance" -> Sensor.SensorStatus.maintenance;
            case "inactive"    -> Sensor.SensorStatus.inactive;
            default            -> Sensor.SensorStatus.active;
        };
    }
}
