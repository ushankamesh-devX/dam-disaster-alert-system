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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
public class AlertController {

    private static final Logger log = LoggerFactory.getLogger(AlertController.class);
    private final AlertService alertService;

    @PostMapping
    @PreAuthorize("hasAnyAuthority('alerts.create', 'alerts.broadcast')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> createAlert(@Valid @RequestBody AlertRequestDTO request) {
        AlertResponseDTO response = alertService.createAlert(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Alert broadcasted successfully", response));
    }

    @PostMapping("/broadcast")
    @PreAuthorize("hasAuthority('alerts.broadcast')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> broadcastEmergencyAlert(
            @Valid @RequestBody AlertRequestDTO request) {
        request.setSeverity(AlertType.AlertSeverity.emergency);
        request.setStatus(Alert.AlertStatus.active);

        AlertResponseDTO response = alertService.createAlert(request);
        logAuditAction("ALERT_BROADCAST",
                "Emergency broadcast sent. alertId=" + response.getId() + ", regionId=" + response.getRegionId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Emergency alert broadcasted successfully", response));
    }

    @GetMapping("/active")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AlertResponseDTO>>> getAllActiveAlerts() {
        List<AlertResponseDTO> response = alertService.getAllActiveAlerts();
        return ResponseEntity.ok(ApiResponse.success("Active alerts retrieved successfully", response));
    }

    @GetMapping("/stats/region/{regionId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRegionalAlertStats(@PathVariable Long regionId) {
        List<AlertResponseDTO> activeAlerts = alertService.searchAlerts(Alert.AlertStatus.active, null, regionId);

        Map<String, Object> stats = new HashMap<>();
        stats.put("regionId", regionId);
        stats.put("activeAlertCount", activeAlerts.size());
        stats.put("affectedPopulation", estimateAffectedPopulation(activeAlerts));

        return ResponseEntity.ok(ApiResponse.success("Regional alert statistics retrieved successfully", stats));
    }

    @GetMapping("/dam/{damId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<AlertResponseDTO>>> getActiveAlertsByDam(@PathVariable Long damId) {
        List<AlertResponseDTO> response = alertService.getActiveAlertsByDamId(damId);
        return ResponseEntity.ok(ApiResponse.success("Dam specific alerts retrieved", response));
    }

    @PostMapping("/simulate/{damId}")
    @PreAuthorize("hasAuthority('alerts.broadcast')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> simulateDamRisk(
            @PathVariable Long damId,
            @RequestParam(defaultValue = "1") Long alertTypeId,
            @RequestParam(required = false) Long regionId) {
        AlertRequestDTO request = new AlertRequestDTO();
        request.setAlertTypeId(alertTypeId);
        request.setTitle("Simulation Alert: Dam " + damId + " At-Risk");
        request.setMessage("Administrative simulation triggered preliminary warning for dam " + damId + ".");
        request.setSeverity(AlertType.AlertSeverity.critical);
        request.setStatus(Alert.AlertStatus.active);
        request.setDamId(damId);
        request.setRegionId(regionId);

        AlertResponseDTO response = alertService.createAlert(request);
        logAuditAction("DAM_RISK_SIMULATION",
                "Dam risk simulation executed. damId=" + damId + ", alertId=" + response.getId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Dam at-risk simulation alert created successfully", response));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('alerts.edit')")
    public ResponseEntity<ApiResponse<AlertResponseDTO>> updateAlertStatus(
            @PathVariable Long id,
            @Valid @RequestBody AlertStatusUpdateRequestDTO request) {
        AlertResponseDTO response = alertService.updateAlertStatus(id, request.getStatus());
        logAuditAction("ALERT_STATUS_UPDATE",
                "Alert status updated. alertId=" + id + ", newStatus=" + request.getStatus());
        return ResponseEntity.ok(ApiResponse.success("Alert status updated to " + request.getStatus(), response));
    }

    @PatchMapping("/resolve-bulk")
    @PreAuthorize("hasAuthority('alerts.edit')")
    public ResponseEntity<ApiResponse<List<AlertResponseDTO>>> resolveBulkAlerts(
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) String incidentRef) {
        if (regionId == null && (incidentRef == null || incidentRef.isBlank())) {
            throw new IllegalArgumentException("regionId or incidentRef is required for bulk resolution");
        }

        List<AlertResponseDTO> candidates = alertService.searchAlerts(Alert.AlertStatus.active, null, regionId);

        List<AlertResponseDTO> targets = candidates.stream()
                .filter(alert -> incidentRef == null || incidentRef.isBlank()
                        || (alert.getTitle() != null
                        && alert.getTitle().toLowerCase().contains(incidentRef.toLowerCase()))
                        || (alert.getMessage() != null
                        && alert.getMessage().toLowerCase().contains(incidentRef.toLowerCase())))
                .toList();

        List<AlertResponseDTO> resolved = targets.stream()
                .filter(alert -> Objects.nonNull(alert.getId()))
                .map(alert -> alertService.updateAlertStatus(alert.getId(), Alert.AlertStatus.resolved))
                .toList();

        logAuditAction("BULK_ALERT_RESOLUTION",
                "Bulk resolution completed. regionId=" + regionId
                        + ", incidentRef=" + incidentRef
                        + ", resolvedCount=" + resolved.size());

        return ResponseEntity.ok(ApiResponse.success("Bulk alert resolution completed", resolved));
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

    private long estimateAffectedPopulation(List<AlertResponseDTO> activeAlerts) {
        // Placeholder for future integration with an actual population/zone impact service.
        // Using a simple estimate of 1,000 people per active alert for now.
        return (long) activeAlerts.size() * 1000L;
    }

    private void logAuditAction(String action, String details) {
        // Placeholder for future AuditService integration.
        log.info("AUDIT_PLACEHOLDER action={} details={}", action, details);
    }
}
