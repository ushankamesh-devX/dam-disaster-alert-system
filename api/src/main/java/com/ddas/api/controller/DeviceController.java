package com.ddas.api.controller;

import com.ddas.api.dto.request.DeviceReadingRequest;
import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.dto.response.DeviceReadingResponse;
import com.ddas.api.entity.Sensor;
import com.ddas.api.service.DeviceApiKeyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * REST endpoints for ESP32 / IoT devices to submit sensor readings.
 * Authentication is handled by DeviceApiKeyAuthFilter via X-Device-API-Key header.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/device")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceApiKeyService deviceApiKeyService;

    /**
     * POST /api/v1/device/readings
     * Submit a single sensor reading from an ESP32 device.
     * The reading is buffered; when the configured interval elapses,
     * the mean of all buffered readings is saved to the database.
     *
     * Header: X-Device-API-Key: ddasdk_...
     * Body:   { "readingValue": 241.3, "unit": "meters", "quality": "good",
     *           "batteryLevel": 85.5, "signalStrength": -42.0, "status": "active" }
     */
    @PostMapping("/readings")
    public ResponseEntity<ApiResponse<DeviceReadingResponse>> submitReading(
            HttpServletRequest httpRequest,
            @Valid @RequestBody DeviceReadingRequest request
    ) {
        String apiKey = (String) httpRequest.getAttribute("deviceApiKeyRaw");
        DeviceReadingResponse response = deviceApiKeyService.submitReading(apiKey, request);

        HttpStatus status = response.isSaved() ? HttpStatus.CREATED : HttpStatus.OK;
        String message = response.isSaved() ? "Mean reading saved" : "Reading buffered";

        return ResponseEntity
                .status(status)
                .body(ApiResponse.success(message, response));
    }

    /**
     * POST /api/v1/device/readings/batch
     * Submit multiple sensor readings from an ESP32 device.
     * All readings are buffered; mean is saved when interval elapses.
     *
     * Header: X-Device-API-Key: ddasdk_...
     * Body:   { "readings": [ { "readingValue": 241.3, ... }, ... ] }
     */
    @PostMapping("/readings/batch")
    public ResponseEntity<ApiResponse<DeviceReadingResponse>> submitBatchReadings(
            HttpServletRequest httpRequest,
            @Valid @RequestBody DeviceReadingRequest.BatchRequest request
    ) {
        String apiKey = (String) httpRequest.getAttribute("deviceApiKeyRaw");
        DeviceReadingResponse response = deviceApiKeyService.submitBatchReadings(apiKey, request.getReadings());

        HttpStatus status = response.isSaved() ? HttpStatus.CREATED : HttpStatus.OK;
        String message = response.isSaved() ? "Mean reading saved" : "Readings buffered";

        return ResponseEntity
                .status(status)
                .body(ApiResponse.success(message, response));
    }

    /**
     * GET /api/v1/device/ping
     * Health check for ESP32 devices. Returns server time and sensor configuration
     * including readingIntervalSeconds so the device can adjust its send rate.
     */
    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ping(HttpServletRequest httpRequest) {
        String apiKey = (String) httpRequest.getAttribute("deviceApiKeyRaw");
        Sensor sensor = deviceApiKeyService.getSensorForApiKey(apiKey);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "ok");
        data.put("serverTime", java.time.LocalDateTime.now().toString());
        data.put("sensorId", sensor.getId());
        data.put("sensorUid", sensor.getSensorUid());
        data.put("sensorName", sensor.getName());
        data.put("readingIntervalSeconds", sensor.getReadingIntervalSeconds() != null
                ? sensor.getReadingIntervalSeconds() : 300);
        data.put("sensorStatus", sensor.getStatus().name());

        return ResponseEntity.ok(ApiResponse.success("Device authenticated successfully", data));
    }
}
