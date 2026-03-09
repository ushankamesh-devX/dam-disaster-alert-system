package com.ddas.api.controller;

import com.ddas.api.dto.request.DeviceReadingRequest;
import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.dto.response.SensorReadingResponse;
import com.ddas.api.service.DeviceApiKeyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
     *
     * Header: X-Device-API-Key: ddasdk_...
     * Body:   { "readingValue": 241.3, "unit": "meters", "quality": "good", "recordedAt": "..." }
     */
    @PostMapping("/readings")
    public ResponseEntity<ApiResponse<SensorReadingResponse>> submitReading(
            HttpServletRequest httpRequest,
            @Valid @RequestBody DeviceReadingRequest request
    ) {
        String apiKey = (String) httpRequest.getAttribute("deviceApiKeyRaw");
        SensorReadingResponse response = deviceApiKeyService.submitReading(apiKey, request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Reading submitted successfully", response));
    }

    /**
     * POST /api/v1/device/readings/batch
     * Submit multiple sensor readings from an ESP32 device.
     *
     * Header: X-Device-API-Key: ddasdk_...
     * Body:   { "readings": [ { "readingValue": 241.3, ... }, { "readingValue": 241.5, ... } ] }
     */
    @PostMapping("/readings/batch")
    public ResponseEntity<ApiResponse<List<SensorReadingResponse>>> submitBatchReadings(
            HttpServletRequest httpRequest,
            @Valid @RequestBody DeviceReadingRequest.BatchRequest request
    ) {
        String apiKey = (String) httpRequest.getAttribute("deviceApiKeyRaw");
        List<SensorReadingResponse> responses = deviceApiKeyService.submitBatchReadings(apiKey, request.getReadings());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(responses.size() + " readings submitted successfully", responses));
    }

    /**
     * GET /api/v1/device/ping
     * Simple health check for ESP32 devices to verify connectivity and API key validity.
     */
    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ping(HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success("Device authenticated successfully", Map.of(
                "status", "ok",
                "serverTime", java.time.LocalDateTime.now().toString()
        )));
    }
}
