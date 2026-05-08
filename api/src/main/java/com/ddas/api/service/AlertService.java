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

import java.time.LocalDateTime;
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

    // =========================================================================
    // Core CRUD
    // =========================================================================

    @Transactional
    public AlertResponseDTO createAlert(AlertRequestDTO req) {
        AlertType alertType = findAlertType(req.getAlertTypeId());

        Alert alert = Alert.builder()
                .alertType(alertType)
                .title(req.getTitle())
                .titleSi(req.getTitleSi())
                .titleTa(req.getTitleTa())
                .message(req.getMessage())
                .messageSi(req.getMessageSi())
                .messageTa(req.getMessageTa())
                .severity(req.getSeverity())
                .status(req.getStatus() != null ? req.getStatus() : Alert.AlertStatus.draft)
                .source(req.getSource() != null ? req.getSource() : "manual")
                .scope(req.getScope() != null ? req.getScope() : "regional")
                .damId(req.getDamId())
                .regionId(req.getRegionId())
                .hazardZoneId(req.getHazardZoneId())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .radiusKm(req.getRadiusKm())
                .hazardLevelId(req.getHazardLevelId())
                .riskScore(req.getRiskScore())
                .actionRequired(req.getActionRequired())
                .actionRequiredSi(req.getActionRequiredSi())
                .instructions(req.getInstructions())
                .safeLocationIds(req.getSafeLocationIds())
                .imageUrl(req.getImageUrl())
                .issuedAt(req.getIssuedAt())
                .effectiveFrom(req.getEffectiveFrom())
                .expiresAt(req.getExpiresAt())
                .build();

        Alert saved = alertRepository.save(alert);
        recordAudit("ALERT_CREATED", saved.getId(),
                "Alert created. status=" + saved.getStatus() + ", severity=" + saved.getSeverity());
        return toResponseDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<AlertResponseDTO> getAllActiveAlerts() {
        return alertRepository
                .findNonExpiredActiveAlerts(LocalDateTime.now())
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
        return alertRepository.searchAlerts(status, severity, regionId, null)
                .stream()
                .map(this::toResponseDTO)
                .toList();
    }

    @Transactional
    public AlertResponseDTO updateAlertStatus(Long alertId, Alert.AlertStatus newStatus) {
        Alert alert = findAlert(alertId);
        alert.setStatus(newStatus);

        // Auto-set timing fields
        if (newStatus == Alert.AlertStatus.active && alert.getIssuedAt() == null) {
            alert.setIssuedAt(LocalDateTime.now());
        }
        if (newStatus == Alert.AlertStatus.resolved && alert.getResolvedAt() == null) {
            alert.setResolvedAt(LocalDateTime.now());
        }

        Alert updated = alertRepository.save(alert);
        recordAudit("ALERT_STATUS_UPDATED", alertId, "Status → " + newStatus);
        return toResponseDTO(updated);
    }

    // =========================================================================
    // Analytics
    // =========================================================================

    @Transactional(readOnly = true)
    public AlertAnalyticsResponseDTO getAlertAnalytics() {
        long totalAlerts   = alertRepository.count();
        long totalActive   = alertRepository.countByStatus(Alert.AlertStatus.active);
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
            long res   = resolvedByDam.getOrDefault(damId, 0L);
            long act   = activeAlertsByDam.getOrDefault(damId, 0L);
            long total = res + act;
            resolutionRateByDam.put(damId, total == 0 ? 0.0 : (double) res / total);
        }

        return AlertAnalyticsResponseDTO.builder()
                .totalAlerts(totalAlerts)
                .totalActive(totalActive)
                .totalResolved(totalResolved)
                .activeAlertsByDam(activeAlertsByDam)
                .resolutionRateByDam(resolutionRateByDam)
                .build();
    }

    // =========================================================================
    // Regional Broadcast
    // =========================================================================

    @Transactional
    public AlertResponseDTO broadcastToRegion(Long regionId, BroadcastRegionRequestDTO req) {
        AlertType alertType = findAlertType(req.getAlertTypeId());

        Alert alert = Alert.builder()
                .alertType(alertType)
                .title(req.getTitle())
                .titleSi(req.getTitleSi())
                .message(req.getMessage())
                .messageSi(req.getMessageSi())
                .severity(req.getSeverity())
                .status(Alert.AlertStatus.active)
                .source("manual")
                .scope("regional")
                .regionId(regionId)
                .damId(req.getDamId())
                .hazardZoneId(req.getHazardZoneId())
                .actionRequired(req.getActionRequired())
                .actionRequiredSi(req.getActionRequiredSi())
                .instructions(req.getInstructions())
                .safeLocationIds(req.getSafeLocationIds())
                .imageUrl(req.getImageUrl())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .radiusKm(req.getRadiusKm())
                .expiresAt(req.getExpiresAt())
                .issuedAt(LocalDateTime.now())
                .build();

        Alert saved = alertRepository.save(alert);
        recordAudit("REGIONAL_BROADCAST", saved.getId(),
                "Regional broadcast regionId=" + regionId + ", severity=" + req.getSeverity());
        return toResponseDTO(saved);
    }

    // =========================================================================
    // Emergency Override
    // =========================================================================

    @Transactional
    public AlertResponseDTO emergencyBroadcast(AlertRequestDTO req) {
        AlertType alertType = findAlertType(req.getAlertTypeId());

        Alert alert = Alert.builder()
                .alertType(alertType)
                .title(req.getTitle())
                .titleSi(req.getTitleSi())
                .message(req.getMessage())
                .messageSi(req.getMessageSi())
                .severity(AlertType.AlertSeverity.emergency)   // always overridden
                .status(Alert.AlertStatus.active)              // always active
                .source("manual")
                .scope(req.getScope() != null ? req.getScope() : "nationwide")
                .damId(req.getDamId())
                .regionId(req.getRegionId())
                .hazardZoneId(req.getHazardZoneId())
                .actionRequired(req.getActionRequired())
                .instructions(req.getInstructions())
                .safeLocationIds(req.getSafeLocationIds())
                .imageUrl(req.getImageUrl())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .radiusKm(req.getRadiusKm())
                .issuedAt(LocalDateTime.now())
                .expiresAt(req.getExpiresAt())
                .build();

        Alert saved = alertRepository.save(alert);
        recordAudit("EMERGENCY_OVERRIDE", saved.getId(),
                "Emergency override. damId=" + saved.getDamId() + ", regionId=" + saved.getRegionId());
        log.warn("EMERGENCY_OVERRIDE persisted. alertId={}, damId={}, regionId={}",
                saved.getId(), saved.getDamId(), saved.getRegionId());
        return toResponseDTO(saved);
    }

    // =========================================================================
    // Simulation Mode
    // =========================================================================

    @Transactional
    public AlertResponseDTO toggleSimulationMode(Long alertId, boolean enable) {
        Alert alert = findAlert(alertId);
        alert.setSimulationMode(enable);
        Alert updated = alertRepository.save(alert);
        recordAudit("SIMULATION_TOGGLED", alertId, "Simulation mode → " + enable);
        return toResponseDTO(updated);
    }

    // =========================================================================
    // Bulk Operations
    // =========================================================================

    @Transactional
    public List<AlertResponseDTO> bulkResolve(BulkAlertActionRequestDTO criteria) {
        validateBulkCriteria(criteria);
        List<Alert> targets = alertRepository.findActiveAlertsForBulkAction(
                criteria.getDamId(), criteria.getSeverity());

        LocalDateTime now = LocalDateTime.now();
        targets.forEach(a -> {
            a.setStatus(Alert.AlertStatus.resolved);
            a.setResolvedAt(now);
        });
        alertRepository.saveAll(targets);
        recordAudit("BULK_RESOLVE", null,
                "Resolved " + targets.size() + " alerts. damId=" + criteria.getDamId());
        return targets.stream().map(this::toResponseDTO).toList();
    }

    @Transactional
    public List<AlertResponseDTO> bulkEscalate(BulkAlertActionRequestDTO criteria) {
        validateBulkCriteria(criteria);
        List<Alert> targets = alertRepository.findActiveAlertsForBulkAction(
                criteria.getDamId(), criteria.getSeverity());
        targets.forEach(a -> a.setStatus(Alert.AlertStatus.escalated));
        alertRepository.saveAll(targets);
        recordAudit("BULK_ESCALATE", null,
                "Escalated " + targets.size() + " alerts. damId=" + criteria.getDamId());
        return targets.stream().map(this::toResponseDTO).toList();
    }

    // =========================================================================
    // Mapper — toResponseDTO (complete mapping against DB schema)
    // =========================================================================

    private AlertResponseDTO toResponseDTO(Alert a) {
        AlertType at = a.getAlertType();
        return AlertResponseDTO.builder()
                // Identity
                .id(a.getId())
                .uuid(a.getUuid())
                // Alert type details
                .alertTypeId(at.getId())
                .alertTypeCode(at.getCode())
                .alertTypeName(at.getName())
                .alertTypeNameSi(at.getNameSi())
                .alertTypeCategory(at.getCategory())
                .alertTypeIcon(at.getIcon())
                .alertTypeColor(at.getColor())
                .requiresAcknowledgment(at.isRequiresAcknowledgment())
                // Content
                .title(a.getTitle())
                .titleSi(a.getTitleSi())
                .titleTa(a.getTitleTa())
                .message(a.getMessage())
                .messageSi(a.getMessageSi())
                .messageTa(a.getMessageTa())
                // Classification
                .severity(a.getSeverity())
                .status(a.getStatus())
                .source(a.getSource())
                .scope(a.getScope())
                // Geographic
                .damId(a.getDamId())
                .regionId(a.getRegionId())
                .hazardZoneId(a.getHazardZoneId())
                .affectedZones(a.getAffectedZones())
                .affectedRegions(a.getAffectedRegions())
                .latitude(a.getLatitude())
                .longitude(a.getLongitude())
                .radiusKm(a.getRadiusKm())
                // Hazard context
                .hazardLevelId(a.getHazardLevelId())
                .riskScore(a.getRiskScore())
                // Instructions
                .actionRequired(a.getActionRequired())
                .actionRequiredSi(a.getActionRequiredSi())
                .instructions(a.getInstructions())
                .safeLocationIds(a.getSafeLocationIds())
                // Media
                .imageUrl(a.getImageUrl())
                // Timing
                .issuedAt(a.getIssuedAt())
                .effectiveFrom(a.getEffectiveFrom())
                .expiresAt(a.getExpiresAt())
                .resolvedAt(a.getResolvedAt())
                .resolutionNotes(a.getResolutionNotes())
                // Stats
                .recipientCount(a.getRecipientCount())
                .deliveredCount(a.getDeliveredCount())
                .readCount(a.getReadCount())
                .acknowledgedCount(a.getAcknowledgedCount())
                // Flags
                .simulationMode(a.isSimulationMode())
                // Audit
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private Alert findAlert(Long id) {
        return alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));
    }

    private AlertType findAlertType(Long id) {
        return alertTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AlertType not found: " + id));
    }

    private void validateBulkCriteria(BulkAlertActionRequestDTO c) {
        if (c.getDamId() == null && c.getSeverity() == null) {
            throw new IllegalArgumentException(
                    "At least one of 'damId' or 'severity' is required for bulk operations.");
        }
    }

    public void recordAudit(String action, Long alertId, String detail) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String adminEmail = "system";
            Long adminId = null;
            if (auth != null && auth.isAuthenticated()
                    && auth.getPrincipal() instanceof UserDetails ud) {
                adminEmail = ud.getUsername();
            }
            alertAuditLogRepository.save(AlertAuditLog.builder()
                    .alertId(alertId)
                    .adminId(adminId)
                    .adminEmail(adminEmail)
                    .action(action)
                    .detail(detail)
                    .build());
            log.info("AUDIT action={} alertId={} admin={} detail={}", action, alertId, adminEmail, detail);
        } catch (Exception ex) {
            log.error("Audit log failed for action={}: {}", action, ex.getMessage(), ex);
        }
    }
}
