package com.ddas.api.service;

import com.ddas.api.dto.request.CreateDeviceApiKeyRequest;
import com.ddas.api.dto.request.CreateSensorReadingRequest;
import com.ddas.api.dto.request.DeviceReadingRequest;
import com.ddas.api.dto.response.DeviceApiKeyCreatedResponse;
import com.ddas.api.dto.response.DeviceApiKeyResponse;
import com.ddas.api.dto.response.DeviceReadingResponse;
import com.ddas.api.dto.response.SensorReadingResponse;
import com.ddas.api.entity.DeviceApiKey;
import com.ddas.api.entity.Sensor;
import com.ddas.api.entity.User;
import com.ddas.api.entity.SensorReading;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ForbiddenException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.exception.UnauthorizedException;
import com.ddas.api.repository.DeviceApiKeyRepository;
import com.ddas.api.repository.SensorRepository;
import com.ddas.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceApiKeyService {

    private final DeviceApiKeyRepository deviceApiKeyRepository;
    private final SensorRepository sensorRepository;
    private final UserRepository userRepository;
    private final SensorService sensorService;
    private final SensorReadingBuffer readingBuffer;

    private static final String KEY_PREFIX = "ddasdk_";
    private static final int KEY_LENGTH = 48; // bytes before base64

    // ============== KEY GENERATION & HASHING ==============

    /**
     * Generate a cryptographically secure random API key.
     * Format: ddasdk_<base64url-encoded-random-bytes>
     */
    private String generateRawApiKey() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[KEY_LENGTH];
        random.nextBytes(bytes);
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return KEY_PREFIX + encoded;
    }

    /**
     * SHA-256 hash of the API key for storage.
     */
    private String hashApiKey(String rawKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawKey.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    // ============== CRUD OPERATIONS ==============

    @Transactional
    public DeviceApiKeyCreatedResponse createApiKey(CreateDeviceApiKeyRequest request, String creatorEmail) {
        log.info("Creating device API key for sensor id: {}, by: {}", request.getSensorId(), creatorEmail);

        Sensor sensor = sensorRepository.findById(request.getSensorId())
                .orElseThrow(() -> new ResourceNotFoundException("Sensor not found with id: " + request.getSensorId()));

        User creator = null;
        if (creatorEmail != null) {
            creator = userRepository.findByEmail(creatorEmail).orElse(null);
        }

        // Generate the raw key
        String rawKey = generateRawApiKey();
        String keyHash = hashApiKey(rawKey);
        String prefix = rawKey.substring(0, Math.min(rawKey.length(), 12));

        DeviceApiKey apiKey = DeviceApiKey.builder()
                .apiKeyHash(keyHash)
                .keyPrefix(prefix)
                .sensor(sensor)
                .name(request.getName())
                .description(request.getDescription())
                .isActive(true)
                .expiresAt(request.getExpiresAt())
                .createdBy(creator)
                .build();

        DeviceApiKey saved = deviceApiKeyRepository.save(apiKey);
        log.info("Device API key created with id: {}, prefix: {}", saved.getId(), prefix);

        return DeviceApiKeyCreatedResponse.builder()
                .id(saved.getId())
                .apiKey(rawKey) // Raw key — shown only once!
                .keyPrefix(prefix)
                .sensorId(sensor.getId())
                .sensorUid(sensor.getSensorUid())
                .sensorName(sensor.getName())
                .name(saved.getName())
                .isActive(saved.getIsActive())
                .expiresAt(saved.getExpiresAt())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public List<DeviceApiKeyResponse> getAllApiKeys() {
        return deviceApiKeyRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DeviceApiKeyResponse getApiKeyById(Long id) {
        DeviceApiKey key = deviceApiKeyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device API key not found with id: " + id));
        return toResponse(key);
    }

    @Transactional(readOnly = true)
    public List<DeviceApiKeyResponse> getApiKeysBySensor(Long sensorId) {
        return deviceApiKeyRepository.findBySensorId(sensorId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deactivateApiKey(Long id) {
        DeviceApiKey key = deviceApiKeyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device API key not found with id: " + id));
        key.setIsActive(false);
        deviceApiKeyRepository.save(key);
        log.info("Device API key deactivated: {}", id);
    }

    @Transactional
    public void activateApiKey(Long id) {
        DeviceApiKey key = deviceApiKeyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device API key not found with id: " + id));
        key.setIsActive(true);
        deviceApiKeyRepository.save(key);
        log.info("Device API key activated: {}", id);
    }

    @Transactional
    public DeviceApiKeyCreatedResponse regenerateApiKey(Long id) {
        DeviceApiKey key = deviceApiKeyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device API key not found with id: " + id));

        // Generate new key
        String rawKey = generateRawApiKey();
        String keyHash = hashApiKey(rawKey);
        String prefix = rawKey.substring(0, Math.min(rawKey.length(), 12));

        key.setApiKeyHash(keyHash);
        key.setKeyPrefix(prefix);
        key.setIsActive(true);
        DeviceApiKey saved = deviceApiKeyRepository.save(key);

        log.info("Device API key regenerated: {}, new prefix: {}", id, prefix);

        Sensor sensor = saved.getSensor();
        return DeviceApiKeyCreatedResponse.builder()
                .id(saved.getId())
                .apiKey(rawKey)
                .keyPrefix(prefix)
                .sensorId(sensor.getId())
                .sensorUid(sensor.getSensorUid())
                .sensorName(sensor.getName())
                .name(saved.getName())
                .isActive(saved.getIsActive())
                .expiresAt(saved.getExpiresAt())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Transactional
    public void deleteApiKey(Long id) {
        if (!deviceApiKeyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Device API key not found with id: " + id);
        }
        deviceApiKeyRepository.deleteById(id);
        log.info("Device API key deleted: {}", id);
    }

    // ============== DEVICE AUTHENTICATION & READING SUBMISSION ==============

    /**
     * Validate an API key and return the associated DeviceApiKey entity.
     */
    @Transactional(readOnly = true)
    public DeviceApiKey validateApiKey(String rawApiKey) {
        if (rawApiKey == null || rawApiKey.isBlank()) {
            throw new UnauthorizedException("API key is required");
        }

        String keyHash = hashApiKey(rawApiKey);
        DeviceApiKey key = deviceApiKeyRepository.findActiveByApiKeyHash(keyHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid or inactive API key"));

        // Check expiry
        if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("API key has expired");
        }

        return key;
    }

    /**
     * Submit a sensor reading from a device.
     * The reading is buffered in memory. When the sensor's readingIntervalSeconds
     * has elapsed since the last saved reading, the buffer is flushed and the
     * mean value is saved to the database.
     *
     * Battery level, signal strength, and status are always updated immediately.
     */
    @Transactional
    public DeviceReadingResponse submitReading(String rawApiKey, DeviceReadingRequest request) {
        DeviceApiKey key = validateApiKey(rawApiKey);
        Sensor sensor = key.getSensor();

        // If sensorId is specified in request, verify it matches the key's sensor
        if (request.getSensorId() != null && !request.getSensorId().equals(sensor.getId())) {
            throw new ForbiddenException("API key is not authorized for sensor id: " + request.getSensorId());
        }

        // Always update metadata immediately (battery, signal, status)
        updateSensorMetadata(sensor, request);

        // Update last used timestamp
        deviceApiKeyRepository.updateLastUsedAt(key.getId(), LocalDateTime.now());

        // Determine the quality string
        String quality = request.getQuality() != null ? request.getQuality() : "good";

        // Buffer the reading value
        readingBuffer.addReading(sensor.getId(), request.getReadingValue(), request.getUnit(), quality);

        // Get the sensor's configured interval (default 300s if not set)
        int intervalSeconds = sensor.getReadingIntervalSeconds() != null
                ? sensor.getReadingIntervalSeconds() : 300;

        // Check if we should flush the buffer (interval elapsed)
        if (readingBuffer.shouldFlush(sensor.getId(), intervalSeconds, sensor.getLastReadingAt())) {
            return flushAndSave(sensor, intervalSeconds);
        }

        // Reading buffered, not yet saved
        int bufferSize = readingBuffer.getBufferSize(sensor.getId());
        log.debug("Reading buffered for sensor {} (buffer size: {}, interval: {}s)",
                sensor.getSensorUid(), bufferSize, intervalSeconds);

        return DeviceReadingResponse.builder()
                .saved(false)
                .message("Reading buffered (" + bufferSize + " readings waiting for interval)")
                .bufferSize(bufferSize)
                .readingIntervalSeconds(intervalSeconds)
                .build();
    }

    /**
     * Submit batch readings from a device.
     * All readings are buffered; if the interval has elapsed, the mean is saved.
     */
    @Transactional
    public DeviceReadingResponse submitBatchReadings(String rawApiKey, List<DeviceReadingRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new BadRequestException("At least one reading is required");
        }

        DeviceApiKey key = validateApiKey(rawApiKey);
        Sensor sensor = key.getSensor();

        log.info("Device batch submission via API key {}: {} readings",
                key.getKeyPrefix(), requests.size());

        // Buffer all readings and update metadata from the latest one
        DeviceReadingRequest lastRequest = null;
        for (DeviceReadingRequest request : requests) {
            if (request.getSensorId() != null && !request.getSensorId().equals(sensor.getId())) {
                throw new ForbiddenException("API key is not authorized for sensor id: " + request.getSensorId());
            }

            String quality = request.getQuality() != null ? request.getQuality() : "good";
            readingBuffer.addReading(sensor.getId(), request.getReadingValue(), request.getUnit(), quality);
            lastRequest = request;
        }

        // Update metadata from the last reading in the batch
        if (lastRequest != null) {
            updateSensorMetadata(sensor, lastRequest);
        }

        // Update last used timestamp
        deviceApiKeyRepository.updateLastUsedAt(key.getId(), LocalDateTime.now());

        // Get the sensor's configured interval
        int intervalSeconds = sensor.getReadingIntervalSeconds() != null
                ? sensor.getReadingIntervalSeconds() : 300;

        // Check if we should flush
        if (readingBuffer.shouldFlush(sensor.getId(), intervalSeconds, sensor.getLastReadingAt())) {
            return flushAndSave(sensor, intervalSeconds);
        }

        int bufferSize = readingBuffer.getBufferSize(sensor.getId());
        return DeviceReadingResponse.builder()
                .saved(false)
                .message(requests.size() + " readings buffered (" + bufferSize + " total waiting)")
                .bufferSize(bufferSize)
                .readingIntervalSeconds(intervalSeconds)
                .build();
    }

    // ============== BUFFER FLUSH ==============

    /**
     * Flush the reading buffer for a sensor, compute mean, and save to database.
     * Called when the configured interval has elapsed.
     *
     * @param sensor          the sensor entity
     * @param intervalSeconds the configured interval
     * @return response with saved reading details
     */
    @Transactional
    public DeviceReadingResponse flushAndSave(Sensor sensor, int intervalSeconds) {
        SensorReadingBuffer.FlushResult result = readingBuffer.flush(sensor.getId());

        if (result == null) {
            log.warn("Flush called for sensor {} but buffer was empty", sensor.getSensorUid());
            return DeviceReadingResponse.builder()
                    .saved(false)
                    .message("Buffer was empty, nothing to save")
                    .bufferSize(0)
                    .readingIntervalSeconds(intervalSeconds)
                    .build();
        }

        // Determine quality — if any reading was suspect/bad, mark the mean as suspect
        SensorReading.ReadingQuality quality;
        try {
            quality = result.quality() != null
                    ? SensorReading.ReadingQuality.valueOf(result.quality())
                    : SensorReading.ReadingQuality.good;
        } catch (IllegalArgumentException e) {
            quality = SensorReading.ReadingQuality.good;
        }

        // Save the mean value as a sensor reading
        CreateSensorReadingRequest readingRequest = CreateSensorReadingRequest.builder()
                .sensorId(sensor.getId())
                .readingValue(result.meanValue())
                .unit(result.unit())
                .quality(quality)
                .recordedAt(result.lastReadingAt())
                .build();

        SensorReadingResponse savedReading = sensorService.createReading(readingRequest);

        log.info("Saved mean reading for sensor {}: mean={}, count={}, min={}, max={}, interval={}s",
                sensor.getSensorUid(), result.meanValue(), result.readingCount(),
                result.minValue(), result.maxValue(), intervalSeconds);

        return DeviceReadingResponse.builder()
                .saved(true)
                .message("Mean of " + result.readingCount() + " readings saved")
                .bufferSize(0)
                .readingIntervalSeconds(intervalSeconds)
                .savedReading(DeviceReadingResponse.SavedReading.builder()
                        .id(savedReading.getId())
                        .meanValue(result.meanValue())
                        .minValue(result.minValue())
                        .maxValue(result.maxValue())
                        .readingCount(result.readingCount())
                        .unit(result.unit())
                        .recordedAt(savedReading.getRecordedAt())
                        .build())
                .build();
    }

    /**
     * Force-flush a sensor's buffer. Used by the stale buffer scheduler.
     *
     * @param sensorId the sensor ID to flush
     * @return the DeviceReadingResponse or null if sensor not found
     */
    @Transactional
    public DeviceReadingResponse forceFlush(Long sensorId) {
        Sensor sensor = sensorRepository.findById(sensorId).orElse(null);
        if (sensor == null) {
            log.warn("Force flush: sensor {} not found, removing buffer", sensorId);
            readingBuffer.removeBuffer(sensorId);
            return null;
        }

        int intervalSeconds = sensor.getReadingIntervalSeconds() != null
                ? sensor.getReadingIntervalSeconds() : 300;

        return flushAndSave(sensor, intervalSeconds);
    }

    /**
     * Get the sensor configuration for a device (used by /ping).
     */
    @Transactional(readOnly = true)
    public Sensor getSensorForApiKey(String rawApiKey) {
        DeviceApiKey key = validateApiKey(rawApiKey);
        return key.getSensor();
    }

    // ============== DEVICE METADATA ==============

    /**
     * Update sensor battery level, signal strength, and status from device-reported values.
     */
    private void updateSensorMetadata(Sensor sensor, DeviceReadingRequest request) {
        boolean updated = false;

        if (request.getBatteryLevel() != null) {
            sensor.setBatteryLevel(request.getBatteryLevel());
            updated = true;
        }
        if (request.getSignalStrength() != null) {
            sensor.setSignalStrength(request.getSignalStrength());
            updated = true;
        }
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            try {
                sensor.setStatus(Sensor.SensorStatus.valueOf(request.getStatus().toLowerCase()));
                updated = true;
            } catch (IllegalArgumentException e) {
                log.warn("Invalid sensor status from device: '{}', ignoring", request.getStatus());
            }
        }

        if (updated) {
            sensorRepository.save(sensor);
            log.debug("Sensor {} metadata updated: battery={}, signal={}, status={}",
                    sensor.getSensorUid(), sensor.getBatteryLevel(),
                    sensor.getSignalStrength(), sensor.getStatus());
        }
    }

    // ============== MAPPING ==============

    private DeviceApiKeyResponse toResponse(DeviceApiKey key) {
        Sensor sensor = key.getSensor();
        return DeviceApiKeyResponse.builder()
                .id(key.getId())
                .keyPrefix(key.getKeyPrefix())
                .sensorId(sensor.getId())
                .sensorUid(sensor.getSensorUid())
                .sensorName(sensor.getName())
                .damId(sensor.getDam().getId())
                .damName(sensor.getDam().getName())
                .name(key.getName())
                .description(key.getDescription())
                .isActive(key.getIsActive())
                .lastUsedAt(key.getLastUsedAt())
                .expiresAt(key.getExpiresAt())
                .createdByEmail(key.getCreatedBy() != null ? key.getCreatedBy().getEmail() : null)
                .createdAt(key.getCreatedAt())
                .build();
    }
}
