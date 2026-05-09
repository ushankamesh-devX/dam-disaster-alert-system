package com.ddas.api.service;

import com.ddas.api.dto.request.AlertRequestDTO;
import com.ddas.api.dto.request.BroadcastRegionRequestDTO;
import com.ddas.api.dto.request.BulkAlertActionRequestDTO;
import com.ddas.api.dto.response.AlertAnalyticsResponseDTO;
import com.ddas.api.dto.response.AlertResponseDTO;
import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertAuditLog;
import com.ddas.api.entity.AlertType;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.AlertAuditLogRepository;
import com.ddas.api.repository.AlertRepository;
import com.ddas.api.repository.AlertTypeRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlertService {

        private static final Logger log = LoggerFactory.getLogger(AlertService.class);

        private final AlertRepository alertRepository;
        private final AlertTypeRepository alertTypeRepository;
        private final AlertAuditLogRepository alertAuditLogRepository;

        // -------------------------------------------------------------------------
        // Existing Operations (unchanged) Helloooo
        // -------------------------------------------------------------------------

        @Transactional
        public AlertResponseDTO createAlert(AlertRequestDTO request) {
                AlertType alertType = alertTypeRepository.findById(request.getAlertTypeId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Alert type not found with id: " + request.getAlertTypeId()));

                Alert alert = Alert.builder()
                                .alertType(alertType)
                                .title(request.getTitle())
                                .message(request.getMessage())
                                .severity(request.getSeverity())
                                .status(request.getStatus() == null ? Alert.AlertStatus.draft : request.getStatus())
                                .damId(request.getDamId())
                                .regionId(request.getRegionId())
                                .build();

                Alert saved = alertRepository.save(alert);
                recordAudit("ALERT_CREATED", saved.getId(),
                                "Alert created with status=" + saved.getStatus() + ", severity=" + saved.getSeverity());
                return toResponseDTO(saved);
        }

        @Transactional(readOnly = true)
        public List<AlertResponseDTO> getAllActiveAlerts() {
                return alertRepository.findByStatus(Alert.AlertStatus.active)
                                .stream()
                                .map(this::toResponseDTO)
                                .toList();
        }

        @Transactional(readOnly = true)
        public List<AlertResponseDTO> getActiveAlertsByDamId(Long damId) {
                return alertRepository.findActiveAlertsByDamId(damId)
                                .stream()
                                .map(this::toResponseDTO)
                                .toList();
        }

        @Transactional(readOnly = true)
        public List<AlertResponseDTO> searchAlerts(Alert.AlertStatus status,
                        AlertType.AlertSeverity severity,
                        Long regionId) {
                return alertRepository.searchAlerts(status, severity, regionId)
                                .stream()
                                .map(this::toResponseDTO)
                                .toList();
        }

        @Transactional
        public AlertResponseDTO updateAlertStatus(Long alertId, Alert.AlertStatus newStatus) {
                Alert alert = alertRepository.findById(alertId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Alert not found with id: " + alertId));

                alert.setStatus(newStatus);
                Alert updated = alertRepository.save(alert);
                recordAudit("ALERT_STATUS_UPDATED", alertId, "Status changed to " + newStatus);
                return toResponseDTO(updated);
        }

        // -------------------------------------------------------------------------
        // Admin Dashboard – Analytics
        // -------------------------------------------------------------------------

        /**
         * Returns aggregated metrics for the Admin Dashboard overview panel.
         * Includes total count, active/resolved totals, active-per-dam map, and
         * per-dam resolution rate.
         */
        @Transactional(readOnly = true)
        public AlertAnalyticsResponseDTO getAlertAnalytics() {
                long totalAlerts = alertRepository.count();
                long totalActive = alertRepository.countByStatus(Alert.AlertStatus.active);
                long totalResolved = alertRepository.countByStatus(Alert.AlertStatus.resolved);

                // Build active-alerts-per-dam map
                List<Alert> activeAlerts = alertRepository.findByStatus(Alert.AlertStatus.active);
                Map<Long, Long> activeAlertsByDam = activeAlerts.stream()
                                .filter(a -> a.getDamId() != null)
                                .collect(Collectors.groupingBy(Alert::getDamId, Collectors.counting()));

                // Compute resolution rate per dam (resolved / (resolved + active))
                List<Alert> resolvedAlerts = alertRepository.findByStatus(Alert.AlertStatus.resolved);
                Map<Long, Long> resolvedByDam = resolvedAlerts.stream()
                                .filter(a -> a.getDamId() != null)
                                .collect(Collectors.groupingBy(Alert::getDamId, Collectors.counting()));

                // Collect all dam IDs present in either map
                Map<Long, Double> resolutionRateByDam = new HashMap<>();
                for (Long damId : resolvedByDam.keySet()) {
                        long resolved = resolvedByDam.getOrDefault(damId, 0L);
                        long active = activeAlertsByDam.getOrDefault(damId, 0L);
                        long total = resolved + active;
                        resolutionRateByDam.put(damId, total == 0 ? 0.0 : (double) resolved / total);
                }

                return AlertAnalyticsResponseDTO.builder()
                                .totalAlerts(totalAlerts)
                                .totalActive(totalActive)
                                .totalResolved(totalResolved)
                                .activeAlertsByDam(activeAlertsByDam)
                                .resolutionRateByDam(resolutionRateByDam)
                                .build();
        }

        // -------------------------------------------------------------------------
        // Admin Dashboard – Regional Targeting
        // -------------------------------------------------------------------------

        /**
         * Broadcasts an alert targeted exclusively to a specific region.
         * People outside that region will NOT receive this alert.
         */
        @Transactional
        public AlertResponseDTO broadcastToRegion(Long regionId, BroadcastRegionRequestDTO request) {
                AlertType alertType = alertTypeRepository.findById(request.getAlertTypeId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Alert type not found with id: " + request.getAlertTypeId()));

                Alert alert = Alert.builder()
                                .alertType(alertType)
                                .title(request.getTitle())
                                .message(request.getMessage())
                                .severity(request.getSeverity())
                                .status(Alert.AlertStatus.active)
                                .regionId(regionId)
                                .damId(request.getDamId())
                                .build();

                Alert saved = alertRepository.save(alert);
                recordAudit("REGIONAL_BROADCAST", saved.getId(),
                                "Regional broadcast to regionId=" + regionId + ", severity=" + request.getSeverity());
                return toResponseDTO(saved);
        }

        // -------------------------------------------------------------------------
        // Admin Dashboard – Emergency Override
        // -------------------------------------------------------------------------

        /**
         * High-priority emergency broadcast that bypasses standard queues.
         * Forces severity=emergency and status=active regardless of the request
         * payload.
         * Intended for imminent dam-breach scenarios.
         */
        @Transactional
        public AlertResponseDTO emergencyBroadcast(AlertRequestDTO request) {
                AlertType alertType = alertTypeRepository.findById(request.getAlertTypeId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Alert type not found with id: " + request.getAlertTypeId()));

                // Force emergency settings — override any payload values
                Alert alert = Alert.builder()
                                .alertType(alertType)
                                .title(request.getTitle())
                                .message(request.getMessage())
                                .severity(AlertType.AlertSeverity.emergency) // always overridden
                                .status(Alert.AlertStatus.active) // always active
                                .damId(request.getDamId())
                                .regionId(request.getRegionId())
                                .build();

                Alert saved = alertRepository.save(alert);
                recordAudit("EMERGENCY_OVERRIDE", saved.getId(),
                                "Emergency override broadcast. damId=" + saved.getDamId()
                                                + ", regionId=" + saved.getRegionId());
                log.warn("EMERGENCY_OVERRIDE alert persisted. alertId={}, damId={}, regionId={}",
                                saved.getId(), saved.getDamId(), saved.getRegionId());
                return toResponseDTO(saved);
        }

        // -------------------------------------------------------------------------
        // Admin Dashboard – Simulation Mode
        // -------------------------------------------------------------------------

        /**
         * Toggles the simulation flag on an alert.
         * When simulationMode=true the mobile app must suppress real emergency UI
         * and display only a drill indicator.
         */
        @Transactional
        public AlertResponseDTO toggleSimulationMode(Long alertId, boolean enable) {
                Alert alert = alertRepository.findById(alertId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Alert not found with id: " + alertId));

                alert.setSimulationMode(enable);
                Alert updated = alertRepository.save(alert);
                recordAudit("SIMULATION_TOGGLED", alertId,
                                "Simulation mode set to " + enable);
                return toResponseDTO(updated);
        }

        // -------------------------------------------------------------------------
        // Admin Dashboard – Bulk Operations
        // -------------------------------------------------------------------------

        /**
         * Resolves all active alerts matching the given criteria (damId and/or
         * severity).
         * At least one filter must be present.
         */
        @Transactional
        public List<AlertResponseDTO> bulkResolve(BulkAlertActionRequestDTO criteria) {
                validateBulkCriteria(criteria);

                List<Alert> targets = alertRepository.findActiveAlertsForBulkAction(
                                criteria.getDamId(), criteria.getSeverity());

                List<Alert> resolved = targets.stream()
                                .peek(a -> a.setStatus(Alert.AlertStatus.resolved))
                                .toList();

                alertRepository.saveAll(resolved);
                recordAudit("BULK_RESOLVE", null,
                                "Bulk resolved " + resolved.size() + " alerts. damId=" + criteria.getDamId()
                                                + ", severity=" + criteria.getSeverity());

                return resolved.stream().map(this::toResponseDTO).toList();
        }

        /**
         * Escalates all active alerts matching the given criteria (damId and/or
         * severity).
         * At least one filter must be present.
         */
        @Transactional
        public List<AlertResponseDTO> bulkEscalate(BulkAlertActionRequestDTO criteria) {
                validateBulkCriteria(criteria);

                List<Alert> targets = alertRepository.findActiveAlertsForBulkAction(
                                criteria.getDamId(), criteria.getSeverity());

                List<Alert> escalated = targets.stream()
                                .peek(a -> a.setStatus(Alert.AlertStatus.escalated))
                                .toList();

                alertRepository.saveAll(escalated);
                recordAudit("BULK_ESCALATE", null,
                                "Bulk escalated " + escalated.size() + " alerts. damId=" + criteria.getDamId()
                                                + ", severity=" + criteria.getSeverity());

                return escalated.stream().map(this::toResponseDTO).toList();
        }

        // -------------------------------------------------------------------------
        // Audit & Traceability Helpers
        // -------------------------------------------------------------------------

        /**
         * Records an audit log entry attributed to the currently authenticated admin.
         * Gracefully falls back to "system" if there is no security context (e.g.
         * tests).
         *
         * @param action  Short action code (e.g. "ALERT_CREATED")
         * @param alertId The affected alert ID (may be null for bulk ops spanning
         *                multiple alerts)
         * @param detail  Human-readable detail string for the audit record
         */
        private void recordAudit(String action, Long alertId, String detail) {
                try {
                        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                        String adminEmail = "system";
                        Long adminId = null;

                        if (auth != null && auth.isAuthenticated()
                                        && auth.getPrincipal() instanceof UserDetails userDetails) {
                                adminEmail = userDetails.getUsername();
                                // If your UserDetails implementation exposes an id, extract it here.
                                // For now we keep adminId null and rely on adminEmail for traceability.
                        }

                        AlertAuditLog entry = AlertAuditLog.builder()
                                        .alertId(alertId)
                                        .adminId(adminId)
                                        .adminEmail(adminEmail)
                                        .action(action)
                                        .detail(detail)
                                        .build();

                        alertAuditLogRepository.save(entry);
                        log.info("AUDIT action={} alertId={} admin={} detail={}", action, alertId, adminEmail, detail);

                } catch (Exception ex) {
                        // Audit failures must never break the main operation
                        log.error("Failed to persist audit log for action={}: {}", action, ex.getMessage(), ex);
                }
        }

        // -------------------------------------------------------------------------
        // Mapper
        // -------------------------------------------------------------------------

        private AlertResponseDTO toResponseDTO(Alert alert) {
                return AlertResponseDTO.builder()
                                .id(alert.getId())
                                .uuid(alert.getUuid())
                                .alertTypeId(alert.getAlertType().getId())
                                .alertTypeName(alert.getAlertType().getName())
                                .title(alert.getTitle())
                                .message(alert.getMessage())
                                .severity(alert.getSeverity())
                                .status(alert.getStatus())
                                .damId(alert.getDamId())
                                .regionId(alert.getRegionId())
                                .simulationMode(alert.isSimulationMode())
                                .createdAt(alert.getCreatedAt())
                                .updatedAt(alert.getUpdatedAt())
                                .build();
        }

        // -------------------------------------------------------------------------
        // Validation Helpers
        // -------------------------------------------------------------------------

        private void validateBulkCriteria(BulkAlertActionRequestDTO criteria) {
                if (criteria.getDamId() == null && criteria.getSeverity() == null) {
                        throw new IllegalArgumentException(
                                        "At least one of 'damId' or 'severity' must be provided for bulk operations.");
                }
        }
}
