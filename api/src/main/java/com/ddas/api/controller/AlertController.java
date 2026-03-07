package com.ddas.api.controller;

import com.ddas.api.dto.request.AlertRequestDTO;
import com.ddas.api.dto.request.BulkAlertActionRequestDTO;
import com.ddas.api.dto.response.AlertAnalyticsResponseDTO;
import com.ddas.api.dto.response.AlertPageResponseDTO;
import com.ddas.api.dto.response.AlertResponseDTO;
import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import com.ddas.api.service.AlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    // =========================================================================
    // Retrieval Operations
    // =========================================================================

    @GetMapping
    @PreAuthorize("hasAuthority('alerts.view')")
    public ResponseEntity<ApiResponse<AlertPageResponseDTO>> getAllAlerts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Alert.AlertStatus status,
            @RequestParam(required = false) AlertType.AlertSeverity severity,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long damId) {
        AlertPageResponseDTO response = alertService.getAllAlertsPaged(page, size, status, severity, regionId, damId);
        return ResponseEntity.ok(ApiResponse.success("Alerts retrieved", response));
    }

    @GetMapping("/list-all")
    @PreAuthorize("hasAuthority('alerts.view')")
    public ResponseEntity<ApiResponse<List<AlertResponseDTO>>> getAllAlertsList() {
        return ResponseEntity.ok(ApiResponse.success("All alerts retrieved", alertService.getAllAlertsList()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('alerts.view')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> getAlertById(@PathVariable Long id) {
        AlertResponseDTO response = alertService.getAlertById(id);
        return ResponseEntity.ok(ApiResponse.success("Alert details retrieved", response));
    }

    @GetMapping("/uuid/{uuid}")
    @PreAuthorize("hasAuthority('alerts.view')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> getAlertByUuid(@PathVariable String uuid) {
        AlertResponseDTO response = alertService.getAlertByUuid(uuid);
        return ResponseEntity.ok(ApiResponse.success("Alert details retrieved", response));
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAuthority('alerts.view')")
    public ResponseEntity<ApiResponse<AlertAnalyticsResponseDTO>> getAlertAnalytics() {
        AlertAnalyticsResponseDTO response = alertService.getAlertAnalytics();
        return ResponseEntity.ok(ApiResponse.success("Alert analytics retrieved", response));
    }

    // =========================================================================
    // Persistence Operations
    // =========================================================================

    @PostMapping
    @PreAuthorize("hasAuthority('alerts.create')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> createAlert(@Valid @RequestBody AlertRequestDTO request) {
        AlertResponseDTO response = alertService.createAlert(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Alert created successfully", response));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('alerts.edit')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> updateAlert(
            @PathVariable Long id, @Valid @RequestBody AlertRequestDTO request) {
        AlertResponseDTO response = alertService.updateAlert(id, request);
        return ResponseEntity.ok(ApiResponse.success("Alert updated successfully", response));
    }

    // =========================================================================
    // Action Operations
    // =========================================================================

    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasAuthority('alerts.resolve')")
    public ResponseEntity<ApiResponse<Void>> resolveAlert(
            @PathVariable Long id, @RequestParam(required = false) String notes) {
        alertService.resolveAlert(id, notes);
        return ResponseEntity.ok(ApiResponse.message("Alert resolved"));
    }

    @PatchMapping("/{id}/escalate")
    @PreAuthorize("hasAuthority('alerts.escalate')")
    public ResponseEntity<ApiResponse<Void>> escalateAlert(
            @PathVariable Long id, @RequestParam(required = false) String reason) {
        alertService.escalateAlert(id, reason);
        return ResponseEntity.ok(ApiResponse.message("Alert escalated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('alerts.delete')")
    public ResponseEntity<ApiResponse<Void>> cancelAlert(@PathVariable Long id) {
        alertService.cancelAlert(id);
        return ResponseEntity.ok(ApiResponse.message("Alert cancelled (soft-delete)"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('alerts.edit')")
    public ResponseEntity<ApiResponse<Void>> updateAlertStatus(
            @PathVariable Long id, @RequestParam Alert.AlertStatus status) {
        alertService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.message("Alert status updated to " + status));
    }

    // =========================================================================
    // Special Broadcasts
    // =========================================================================

    @PostMapping("/emergency-override")
    @PreAuthorize("hasAuthority('alerts.broadcast')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> emergencyOverrideBroadcast(
            @Valid @RequestBody AlertRequestDTO request) {
        // Force emergency status and severity in service
        request.setSeverity(AlertType.AlertSeverity.emergency);
        request.setStatus(Alert.AlertStatus.active);
        AlertResponseDTO response = alertService.createAlert(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Emergency override broadcast issued successfully", response));
    }
}
