package com.ddas.api.service;

import com.ddas.api.dto.request.AlertRequestDTO;
import com.ddas.api.dto.request.AlertTypeRequestDTO;
import com.ddas.api.dto.request.BulkAlertActionRequestDTO;
import com.ddas.api.dto.response.*;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final AlertRepository alertRepository;
    private final AlertTypeRepository alertTypeRepository;
    private final AlertAuditLogRepository alertAuditLogRepository;

    // =========================================================================
    // Alert Operations
    // =========================================================================

    @Transactional(readOnly = true)
    public AlertPageResponseDTO getAllAlertsPaged(int page, int size, Alert.AlertStatus status, AlertType.AlertSeverity severity, Long regionId, Long damId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("issuedAt").descending());
        Page<Alert> resultPage = alertRepository.searchAlerts(status, severity, regionId, damId, pageable);
        
        return AlertPageResponseDTO.builder()
                .content(resultPage.getContent().stream().map(this::toResponseDTO).toList())
                .page(resultPage.getNumber())
                .size(resultPage.getSize())
                .totalElements(resultPage.getTotalElements())
                .totalPages(resultPage.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public AlertResponseDTO getAlertById(Long id) {
        return alertRepository.findById(id)
                .map(this::toResponseDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public AlertResponseDTO getAlertByUuid(String uuid) {
        return alertRepository.findByUuid(uuid)
                .map(this::toResponseDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with uuid: " + uuid));
    }

    @Transactional
    public AlertResponseDTO createAlert(AlertRequestDTO request) {
        AlertType type = resolveAlertType(request.getAlertTypeId());

        Alert alert = Alert.builder()
                .uuid(UUID.randomUUID().toString())
                .alertType(type)
                .title(request.getTitle())
                .titleSi(request.getTitleSi())
                .titleTa(request.getTitleTa())
                .message(request.getMessage())
                .messageSi(request.getMessageSi())
                .messageTa(request.getMessageTa())
                .severity(request.getSeverity())
                .source(request.getSource() != null ? request.getSource() : Alert.AlertSource.manual)
                .sourceSystem(request.getSourceSystem())
                .scope(request.getScope() != null ? request.getScope() : Alert.AlertScope.regional)
                .regionId(request.getRegionId())
                .damId(request.getDamId())
                .hazardZoneId(request.getHazardZoneId())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .radiusKm(request.getRadiusKm())
                .hazardLevelId(request.getHazardLevelId())
                .riskScore(request.getRiskScore())
                .imageUrl(request.getImageUrl())
                .actionRequired(request.getActionRequired())
                .actionRequiredSi(request.getActionRequiredSi())
                .instructions(request.getInstructions())
                .instructionsSi(request.getInstructionsSi())
                .status(request.getStatus() != null ? request.getStatus() : Alert.AlertStatus.draft)
                .issuedAt(resolveIssuedAt(request))
                .effectiveFrom(request.getEffectiveFrom())
                .expiresAt(request.getExpiresAt())
                .simulationMode(request.isSimulationMode())
                .build();

        Alert saved = alertRepository.save(alert);
        recordAudit("ALERT_CREATED", saved.getId(), "Created alert: " + saved.getTitle());
        return toResponseDTO(saved);
    }

    @Transactional
    public AlertResponseDTO updateAlert(Long id, AlertRequestDTO request) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));

        alert.setAlertType(resolveAlertType(request.getAlertTypeId()));
        alert.setTitle(request.getTitle());
        alert.setTitleSi(request.getTitleSi());
        alert.setTitleTa(request.getTitleTa());
        alert.setMessage(request.getMessage());
        alert.setMessageSi(request.getMessageSi());
        alert.setMessageTa(request.getMessageTa());
        alert.setSeverity(request.getSeverity());
        alert.setSource(request.getSource());
        alert.setSourceSystem(request.getSourceSystem());
        alert.setScope(request.getScope());
        alert.setRegionId(request.getRegionId());
        alert.setDamId(request.getDamId());
        alert.setHazardZoneId(request.getHazardZoneId());
        alert.setLatitude(request.getLatitude());
        alert.setLongitude(request.getLongitude());
        alert.setRadiusKm(request.getRadiusKm());
        alert.setHazardLevelId(request.getHazardLevelId());
        alert.setRiskScore(request.getRiskScore());
        alert.setImageUrl(request.getImageUrl());
        alert.setActionRequired(request.getActionRequired());
        alert.setActionRequiredSi(request.getActionRequiredSi());
        alert.setInstructions(request.getInstructions());
        alert.setInstructionsSi(request.getInstructionsSi());
        alert.setStatus(request.getStatus());
        alert.setIssuedAt(request.getIssuedAt());
        alert.setExpiresAt(request.getExpiresAt());
        alert.setSimulationMode(request.isSimulationMode());

        Alert updated = alertRepository.save(alert);
        recordAudit("ALERT_UPDATED", id, "Updated alert content");
        return toResponseDTO(updated);
    }

    @Transactional
    public void resolveAlert(Long id, String notes) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
        alert.setStatus(Alert.AlertStatus.resolved);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolutionNotes(notes);
        alertRepository.save(alert);
        recordAudit("ALERT_RESOLVED", id, "Reason: " + notes);
    }

    @Transactional
    public void escalateAlert(Long id, String reason) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
        AlertType.AlertSeverity nextSeverity = bumpSeverity(alert.getSeverity());
        alert.setSeverity(nextSeverity);
        alert.setStatus(Alert.AlertStatus.escalated);
        alertRepository.save(alert);
        recordAudit("ALERT_ESCALATED", id, "New severity: " + nextSeverity + ". Reason: " + reason);
    }

    @Transactional
    public void cancelAlert(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
        alert.setStatus(Alert.AlertStatus.cancelled);
        alertRepository.save(alert);
        recordAudit("ALERT_CANCELLED", id, "Manual cancellation");
    }

    @Transactional
    public void updateStatus(Long id, Alert.AlertStatus status) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + id));
        Alert.AlertStatus oldStatus = alert.getStatus();
        alert.setStatus(status);
        alertRepository.save(alert);
        recordAudit("STATUS_CHANGED", id, "Changed from " + oldStatus + " to " + status);
    }

    @Transactional(readOnly = true)
    public List<AlertResponseDTO> getAllAlertsList() {
        return alertRepository.findAll(Sort.by("issuedAt").descending()).stream()
                .map(this::toResponseDTO)
                .toList();
    }

    // =========================================================================
    // Analytics
    // =========================================================================

    @Transactional(readOnly = true)
    public AlertAnalyticsResponseDTO getAlertAnalytics() {
        long totalAlerts = alertRepository.count();
        
        Map<String, Long> byStatus = alertRepository.countByStatus().stream()
                .collect(Collectors.toMap(row -> ((Alert.AlertStatus)row[0]).name(), row -> (Long)row[1]));
        
        Map<String, Long> bySeverity = alertRepository.countBySeverity().stream()
                .collect(Collectors.toMap(row -> ((AlertType.AlertSeverity)row[0]).name(), row -> (Long)row[1]));

        Map<String, Long> byCategory = alertRepository.countByCategory().stream()
                .collect(Collectors.toMap(row -> ((AlertType.AlertCategory)row[0]).name(), row -> (Long)row[1]));

        Map<Long, Long> activeByDam = alertRepository.countActiveAlertsByDam().stream()
                .filter(row -> row[0] != null)
                .collect(Collectors.toMap(row -> (Long)row[0], row -> (Long)row[1]));

        long totalActive = byStatus.getOrDefault("active", 0L) + byStatus.getOrDefault("escalated", 0L);
        long totalResolved = byStatus.getOrDefault("resolved", 0L);

        return AlertAnalyticsResponseDTO.builder()
                .totalAlerts(totalAlerts)
                .totalActive(totalActive)
                .totalResolved(totalResolved)
                .totalEscalated(byStatus.getOrDefault("escalated", 0L))
                .totalExpired(byStatus.getOrDefault("expired", 0L))
                .totalCancelled(byStatus.getOrDefault("cancelled", 0L))
                .totalDraft(byStatus.getOrDefault("draft", 0L))
                .activeAlertsByDam(activeByDam)
                .bySeverity(bySeverity)
                .byStatus(byStatus)
                .byCategory(byCategory)
                .build();
    }

    // =========================================================================
    // Alert Type Management
    // =========================================================================

    @Transactional(readOnly = true)
    public List<AlertTypeResponseDTO> getAllAlertTypes() {
        return alertTypeRepository.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::toAlertTypeResponseDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AlertTypeResponseDTO> getActiveAlertTypes() {
        return alertTypeRepository.findByActiveTrue().stream()
                .map(this::toAlertTypeResponseDTO)
                .toList();
    }

    @Transactional
    public AlertTypeResponseDTO createAlertType(AlertTypeRequestDTO request) {
        if (alertTypeRepository.existsByCode(request.getCode())) {
            throw new IllegalArgumentException("Code already exists: " + request.getCode());
        }
        AlertType type = AlertType.builder()
                .code(request.getCode())
                .name(request.getName())
                .nameSi(request.getNameSi())
                .nameTa(request.getNameTa())
                .description(request.getDescription())
                .category(request.getCategory())
                .severity(request.getSeverity())
                .icon(request.getIcon())
                .color(request.getColor())
                .sound(request.getSound())
                .acknowledgmentRequired(request.isAcknowledgmentRequired())
                .autoExpireHours(request.getAutoExpireHours())
                .titleTemplate(request.getTitleTemplate())
                .titleTemplateSi(request.getTitleTemplateSi())
                .bodyTemplate(request.getBodyTemplate())
                .bodyTemplateSi(request.getBodyTemplateSi())
                .active(request.isActive())
                .displayOrder(request.getDisplayOrder())
                .build();
        return toAlertTypeResponseDTO(alertTypeRepository.save(type));
    }

    @Transactional
    public AlertTypeResponseDTO updateAlertType(Long id, AlertTypeRequestDTO request) {
        AlertType type = alertTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert type not found: " + id));
        
        type.setName(request.getName());
        type.setNameSi(request.getNameSi());
        type.setNameTa(request.getNameTa());
        type.setDescription(request.getDescription());
        type.setCategory(request.getCategory());
        type.setSeverity(request.getSeverity());
        type.setIcon(request.getIcon());
        type.setColor(request.getColor());
        type.setSound(request.getSound());
        type.setAcknowledgmentRequired(request.isAcknowledgmentRequired());
        type.setAutoExpireHours(request.getAutoExpireHours());
        type.setTitleTemplate(request.getTitleTemplate());
        type.setTitleTemplateSi(request.getTitleTemplateSi());
        type.setBodyTemplate(request.getBodyTemplate());
        type.setBodyTemplateSi(request.getBodyTemplateSi());
        type.setActive(request.isActive());
        type.setDisplayOrder(request.getDisplayOrder());

        return toAlertTypeResponseDTO(alertTypeRepository.save(type));
    }

    @Transactional
    public void deleteAlertType(Long id) {
        AlertType type = alertTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert type not found: " + id));
        type.setActive(false); // Soft delete
        alertTypeRepository.save(type);
    }

    // =========================================================================
    // Helpers & Mappers
    // =========================================================================

    private AlertType resolveAlertType(Long id) {
        return alertTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert type not found with id: " + id));
    }

    private LocalDateTime resolveIssuedAt(AlertRequestDTO request) {
        if (request.getIssuedAt() != null) return request.getIssuedAt();
        if (request.getStatus() == Alert.AlertStatus.active) return LocalDateTime.now();
        return null;
    }

    private AlertType.AlertSeverity bumpSeverity(AlertType.AlertSeverity current) {
        return switch (current) {
            case info -> AlertType.AlertSeverity.warning;
            case warning -> AlertType.AlertSeverity.critical;
            case critical -> AlertType.AlertSeverity.emergency;
            case emergency -> AlertType.AlertSeverity.emergency;
        };
    }

    private void recordAudit(String action, Long alertId, String detail) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = "system";
            if (auth != null && auth.getPrincipal() instanceof UserDetails ud) email = ud.getUsername();
            
            alertAuditLogRepository.save(AlertAuditLog.builder()
                    .alertId(alertId)
                    .adminEmail(email)
                    .action(action)
                    .detail(detail)
                    .build());
        } catch (Exception e) {
            log.error("Audit fail", e);
        }
    }

    private AlertResponseDTO toResponseDTO(Alert alert) {
        return AlertResponseDTO.builder()
                .id(alert.getId())
                .uuid(alert.getUuid())
                .alertTypeId(alert.getAlertType().getId())
                .alertTypeCode(alert.getAlertType().getCode())
                .alertTypeName(alert.getAlertType().getName())
                .alertTypeCategory(alert.getAlertType().getCategory())
                .alertTypeIcon(alert.getAlertType().getIcon())
                .alertTypeColor(alert.getAlertType().getColor())
                .title(alert.getTitle())
                .titleSi(alert.getTitleSi())
                .titleTa(alert.getTitleTa())
                .message(alert.getMessage())
                .messageSi(alert.getMessageSi())
                .messageTa(alert.getMessageTa())
                .severity(alert.getSeverity())
                .source(alert.getSource())
                .sourceSystem(alert.getSourceSystem())
                .scope(alert.getScope())
                .regionId(alert.getRegionId())
                .damId(alert.getDamId())
                .hazardZoneId(alert.getHazardZoneId())
                .latitude(alert.getLatitude())
                .longitude(alert.getLongitude())
                .radiusKm(alert.getRadiusKm())
                .hazardLevelId(alert.getHazardLevelId())
                .riskScore(alert.getRiskScore())
                .imageUrl(alert.getImageUrl())
                .actionRequired(alert.getActionRequired())
                .actionRequiredSi(alert.getActionRequiredSi())
                .instructions(alert.getInstructions())
                .instructionsSi(alert.getInstructionsSi())
                .status(alert.getStatus())
                .recipientCount(alert.getRecipientCount())
                .deliveredCount(alert.getDeliveredCount())
                .readCount(alert.getReadCount())
                .acknowledgedCount(alert.getAcknowledgedCount())
                .simulationMode(alert.isSimulationMode())
                .issuedAt(alert.getIssuedAt())
                .effectiveFrom(alert.getEffectiveFrom())
                .expiresAt(alert.getExpiresAt())
                .resolvedAt(alert.getResolvedAt())
                .resolutionNotes(alert.getResolutionNotes())
                .resolvedBy(alert.getResolvedBy())
                .createdBy(alert.getCreatedBy())
                .updatedBy(alert.getUpdatedBy())
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .build();
    }

    private AlertTypeResponseDTO toAlertTypeResponseDTO(AlertType type) {
        return AlertTypeResponseDTO.builder()
                .id(type.getId())
                .code(type.getCode())
                .name(type.getName())
                .nameSi(type.getNameSi())
                .nameTa(type.getNameTa())
                .description(type.getDescription())
                .category(type.getCategory())
                .severity(type.getSeverity())
                .icon(type.getIcon())
                .color(type.getColor())
                .sound(type.getSound())
                .acknowledgmentRequired(type.isAcknowledgmentRequired())
                .autoExpireHours(type.getAutoExpireHours())
                .titleTemplate(type.getTitleTemplate())
                .titleTemplateSi(type.getTitleTemplateSi())
                .bodyTemplate(type.getBodyTemplate())
                .bodyTemplateSi(type.getBodyTemplateSi())
                .active(type.isActive())
                .displayOrder(type.getDisplayOrder())
                .createdAt(type.getCreatedAt())
                .updatedAt(type.getUpdatedAt())
                .build();
    }
}
