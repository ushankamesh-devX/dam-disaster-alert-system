package com.ddas.api.service;

import com.ddas.api.dto.request.CreateDeviceApiKeyRequest;
import com.ddas.api.dto.request.CreateSensorReadingRequest;
import com.ddas.api.dto.request.DeviceReadingRequest;
import com.ddas.api.dto.response.DeviceApiKeyCreatedResponse;
import com.ddas.api.dto.response.DeviceApiKeyResponse;
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
     */
    @Transactional
    public SensorReadingResponse submitReading(String rawApiKey, DeviceReadingRequest request) {
        DeviceApiKey key = validateApiKey(rawApiKey);
        Sensor sensor = key.getSensor();

        // If sensorId is specified in request, verify it matches the key's sensor
        if (request.getSensorId() != null && !request.getSensorId().equals(sensor.getId())) {
            throw new ForbiddenException("API key is not authorized for sensor id: " + request.getSensorId());
        }

        // Convert to the existing CreateSensorReadingRequest
        CreateSensorReadingRequest readingRequest = CreateSensorReadingRequest.builder()
                .sensorId(sensor.getId())
                .readingValue(request.getReadingValue())
                .unit(request.getUnit())
                .quality(request.getQuality() != null
                        ? SensorReading.ReadingQuality.valueOf(request.getQuality())
                        : null)
                .recordedAt(request.getRecordedAt())
                .build();

        // Use existing SensorService to save reading
        SensorReadingResponse response = sensorService.createReading(readingRequest);

        // Update last used timestamp (async-safe)
        deviceApiKeyRepository.updateLastUsedAt(key.getId(), LocalDateTime.now());

        log.debug("Device reading submitted via API key {}: sensor={}, value={}",
                key.getKeyPrefix(), sensor.getSensorUid(), request.getReadingValue());

        return response;
    }

    /**
     * Submit batch readings from a device.
     */
    @Transactional
    public List<SensorReadingResponse> submitBatchReadings(String rawApiKey, List<DeviceReadingRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new BadRequestException("At least one reading is required");
        }

        DeviceApiKey key = validateApiKey(rawApiKey);

        log.info("Device batch submission via API key {}: {} readings",
                key.getKeyPrefix(), requests.size());

        return requests.stream()
                .map(request -> submitSingleReading(key, request))
                .toList();
    }

    private SensorReadingResponse submitSingleReading(DeviceApiKey key, DeviceReadingRequest request) {
        Sensor sensor = key.getSensor();

        if (request.getSensorId() != null && !request.getSensorId().equals(sensor.getId())) {
            throw new ForbiddenException("API key is not authorized for sensor id: " + request.getSensorId());
        }

        CreateSensorReadingRequest readingRequest = CreateSensorReadingRequest.builder()
                .sensorId(sensor.getId())
                .readingValue(request.getReadingValue())
                .unit(request.getUnit())
                .quality(request.getQuality() != null
                        ? SensorReading.ReadingQuality.valueOf(request.getQuality())
                        : null)
                .recordedAt(request.getRecordedAt())
                .build();

        SensorReadingResponse response = sensorService.createReading(readingRequest);
        deviceApiKeyRepository.updateLastUsedAt(key.getId(), LocalDateTime.now());

        return response;
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
