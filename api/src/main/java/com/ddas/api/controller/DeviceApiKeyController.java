package com.ddas.api.controller;

import com.ddas.api.dto.request.CreateDeviceApiKeyRequest;
import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.dto.response.DeviceApiKeyCreatedResponse;
import com.ddas.api.dto.response.DeviceApiKeyResponse;
import com.ddas.api.service.DeviceApiKeyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin endpoints for managing device API keys.
 * All endpoints require JWT authentication + dams.manage_sensors permission.
 */
@RestController
@RequestMapping("/api/v1/device-keys")
@RequiredArgsConstructor
public class DeviceApiKeyController {

    private final DeviceApiKeyService deviceApiKeyService;

    /**
     * GET /api/v1/device-keys
     * List all device API keys.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<List<DeviceApiKeyResponse>> getAllApiKeys() {
        return ResponseEntity.ok(deviceApiKeyService.getAllApiKeys());
    }

    /**
     * GET /api/v1/device-keys/{id}
     * Get a device API key by ID.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<DeviceApiKeyResponse> getApiKeyById(@PathVariable Long id) {
        return ResponseEntity.ok(deviceApiKeyService.getApiKeyById(id));
    }

    /**
     * GET /api/v1/device-keys/sensor/{sensorId}
     * Get all device API keys for a specific sensor.
     */
    @GetMapping("/sensor/{sensorId}")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<List<DeviceApiKeyResponse>> getApiKeysBySensor(@PathVariable Long sensorId) {
        return ResponseEntity.ok(deviceApiKeyService.getApiKeysBySensor(sensorId));
    }

    /**
     * POST /api/v1/device-keys
     * Create a new device API key for a sensor.
     * Returns the raw API key only once.
     */
    @PostMapping
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<ApiResponse<DeviceApiKeyCreatedResponse>> createApiKey(
            @Valid @RequestBody CreateDeviceApiKeyRequest request,
            Authentication authentication
    ) {
        String email = authentication != null ? authentication.getName() : null;
        DeviceApiKeyCreatedResponse response = deviceApiKeyService.createApiKey(request, email);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("API key created successfully. Save it now — it won't be shown again!", response));
    }

    /**
     * PUT /api/v1/device-keys/{id}/deactivate
     * Deactivate a device API key.
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<ApiResponse<Void>> deactivateApiKey(@PathVariable Long id) {
        deviceApiKeyService.deactivateApiKey(id);
        return ResponseEntity.ok(ApiResponse.success("API key deactivated", null));
    }

    /**
     * PUT /api/v1/device-keys/{id}/activate
     * Activate a device API key.
     */
    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<ApiResponse<Void>> activateApiKey(@PathVariable Long id) {
        deviceApiKeyService.activateApiKey(id);
        return ResponseEntity.ok(ApiResponse.success("API key activated", null));
    }

    /**
     * POST /api/v1/device-keys/{id}/regenerate
     * Regenerate (rotate) a device API key. Old key becomes invalid.
     */
    @PostMapping("/{id}/regenerate")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<ApiResponse<DeviceApiKeyCreatedResponse>> regenerateApiKey(@PathVariable Long id) {
        DeviceApiKeyCreatedResponse response = deviceApiKeyService.regenerateApiKey(id);
        return ResponseEntity.ok(ApiResponse.success("API key regenerated. Save the new key — it won't be shown again!", response));
    }

    /**
     * DELETE /api/v1/device-keys/{id}
     * Permanently delete a device API key.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<Void> deleteApiKey(@PathVariable Long id) {
        deviceApiKeyService.deleteApiKey(id);
        return ResponseEntity.noContent().build();
    }
}
