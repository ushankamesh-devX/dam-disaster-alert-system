package com.ddas.api.controller;

import com.ddas.api.dto.request.AlertRequestDTO;
import com.ddas.api.dto.request.AlertStatusUpdateRequestDTO;
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

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('alerts.create', 'alerts.broadcast')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> createAlert(@Valid @RequestBody AlertRequestDTO request) {
        AlertResponseDTO response = alertService.createAlert(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Alert broadcasted successfully", response));
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AlertResponseDTO>>> getAllActiveAlerts() {
        List<AlertResponseDTO> response = alertService.getAllActiveAlerts();
        return ResponseEntity.ok(ApiResponse.success("Active alerts retrieved successfully", response));
    }

    @GetMapping("/dam/{damId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AlertResponseDTO>>> getActiveAlertsByDam(@PathVariable Long damId) {
        List<AlertResponseDTO> response = alertService.getActiveAlertsByDamId(damId);
        return ResponseEntity.ok(ApiResponse.success("Dam specific alerts retrieved", response));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('alerts.edit')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> updateAlertStatus(
            @PathVariable Long id,
            @Valid @RequestBody AlertStatusUpdateRequestDTO request) {
        AlertResponseDTO response = alertService.updateAlertStatus(id, request.getStatus());
        return ResponseEntity.ok(ApiResponse.success("Alert status updated to " + request.getStatus(), response));
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AlertResponseDTO>>> searchAlerts(
            @RequestParam(required = false) Alert.AlertStatus status,
            @RequestParam(required = false) AlertType.AlertSeverity severity,
            @RequestParam(required = false) Long regionId) {
        List<AlertResponseDTO> response = alertService.searchAlerts(status, severity, regionId);
        return ResponseEntity.ok(ApiResponse.success("Search results retrieved", response));
    }
}
