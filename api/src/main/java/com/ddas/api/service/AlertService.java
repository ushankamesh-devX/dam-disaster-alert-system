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

        // අලුතින් එකතු කළ SMS සේවාව (@RequiredArgsConstructor මගින් ස්වයංක්‍රීයව Inject
        // වේ)
        private final SmsDispatcherService smsDispatcherService;

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

                // Alert එක Save වූ වහාම SMS යැවීම
                triggerTestSms(saved);

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

        @Transactional(readOnly = true)
        public AlertAnalyticsResponseDTO getAlertAnalytics() {
                long totalAlerts = alertRepository.count();
                long totalActive = alertRepository.countByStatus(Alert.AlertStatus.active);
                long totalResolved = alertRepository.countByStatus(Alert.AlertStatus.resolved);

                List<Alert> activeAlerts = alertRepository.findByStatus(Alert.AlertStatus.active);
                Map<Long, Long> activeAlertsByDam = activeAlerts.stream()
                                .filter(a -> a.getDamId() != null)
                                .collect(Collectors.groupingBy(Alert::getDamId, Collectors.counting()));

                List<Alert> resolvedAlerts = alertRepository.findByStatus(Alert.AlertStatus.resolved);
                Map<Long, Long> resolvedByDam = resolvedAlerts.stream()
                                .filter(a -> a.getDamId() != null)
                                .collect(Collectors.groupingBy(Alert::getDamId, Collectors.counting()));

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

                // Regional Broadcast එකක් Save වූ වහාම SMS යැවීම
                triggerTestSms(saved);

                return toResponseDTO(saved);
        }

        // -------------------------------------------------------------------------
        // Admin Dashboard – Emergency Override
        // -------------------------------------------------------------------------

        @Transactional
        public AlertResponseDTO emergencyBroadcast(AlertRequestDTO request) {
                AlertType alertType = alertTypeRepository.findById(request.getAlertTypeId())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Alert type not found with id: " + request.getAlertTypeId()));

                Alert alert = Alert.builder()
                                .alertType(alertType)
                                .title(request.getTitle())
                                .message(request.getMessage())
                                .severity(AlertType.AlertSeverity.emergency)
                                .status(Alert.AlertStatus.active)
                                .damId(request.getDamId())
                                .regionId(request.getRegionId())
                                .build();

                Alert saved = alertRepository.save(alert);
                recordAudit("EMERGENCY_OVERRIDE", saved.getId(),
                                "Emergency override broadcast. damId=" + saved.getDamId()
                                                + ", regionId=" + saved.getRegionId());
                log.warn("EMERGENCY_OVERRIDE alert persisted. alertId={}, damId={}, regionId={}",
                                saved.getId(), saved.getDamId(), saved.getRegionId());

                // Emergency Broadcast එකක් Save වූ වහාම SMS යැවීම
                triggerTestSms(saved);

                return toResponseDTO(saved);
        }

        // -------------------------------------------------------------------------
        // Admin Dashboard – Simulation Mode
        // -------------------------------------------------------------------------

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

        private void recordAudit(String action, Long alertId, String detail) {
                try {
                        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                        String adminEmail = "system";
                        Long adminId = null;

                        if (auth != null && auth.isAuthenticated()
                                        && auth.getPrincipal() instanceof UserDetails userDetails) {
                                adminEmail = userDetails.getUsername();
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
                        log.error("Failed to persist audit log for action={}: {}", action, ex.getMessage(), ex);
                }
        }

        // -------------------------------------------------------------------------
        // SMS Notification Helper
        // -------------------------------------------------------------------------

        private void triggerTestSms(Alert alert) {
                // Critical හෝ Emergency අනතුරු මට්ටම් වලදී පමණක් SMS යැවීම
                if (alert.getSeverity() == AlertType.AlertSeverity.critical
                                || alert.getSeverity() == AlertType.AlertSeverity.emergency) {

                        String testPhoneNumber = "+94714742292"; // ඔබ ලබා දුන් පරීක්ෂණ අංකය
                        String smsMessage = "DDAS ALERT: " + alert.getTitle() + " - " + alert.getSeverity();

                        try {
                                smsDispatcherService.sendSms(testPhoneNumber, smsMessage);
                                log.info("SMS triggered successfully for alert ID: {}", alert.getId());
                        } catch (Exception e) {
                                log.error("Failed to trigger SMS for alert ID: {}", alert.getId(), e);
                        }
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