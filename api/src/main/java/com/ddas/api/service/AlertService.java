package com.ddas.api.service;

import com.ddas.api.dto.request.AlertRequestDTO;
import com.ddas.api.dto.response.AlertResponseDTO;
import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.AlertRepository;
import com.ddas.api.repository.AlertTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;
    private final AlertTypeRepository alertTypeRepository;

    @Transactional
    public AlertResponseDTO createAlert(AlertRequestDTO request) {
        AlertType alertType = alertTypeRepository.findById(request.getAlertTypeId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Alert type not found with id: " + request.getAlertTypeId()
                ));

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
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found with id: " + alertId));

        alert.setStatus(newStatus);
        Alert updated = alertRepository.save(alert);
        return toResponseDTO(updated);
    }

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
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .build();
    }
}
