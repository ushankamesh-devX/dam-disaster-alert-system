package com.ddas.api.service;

import com.ddas.api.dto.request.CreateOverflowConfigRequest;
import com.ddas.api.dto.response.ml.MlOverflowConfigResponse;
import com.ddas.api.entity.Dam;
import com.ddas.api.entity.DamCurrentStatus;
import com.ddas.api.entity.DamOverflowConfig;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.DamCurrentStatusRepository;
import com.ddas.api.repository.DamOverflowConfigRepository;
import com.ddas.api.repository.DamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DamOverflowConfigService {

    private final DamRepository damRepository;
    private final DamCurrentStatusRepository damCurrentStatusRepository;
    private final DamOverflowConfigRepository damOverflowConfigRepository;

    public MlOverflowConfigResponse getActiveConfig(Long damId) {
        Dam dam = damRepository.findById(damId)
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + damId));

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        Optional<DamOverflowConfig> activeOpt = damOverflowConfigRepository.findActiveConfigByDamId(damId, now);

        if (activeOpt.isPresent()) {
            DamOverflowConfig config = activeOpt.get();
            String effectiveFromStr = config.getEffectiveFrom().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            return MlOverflowConfigResponse.builder()
                    .damId(dam.getId())
                    .verifiedThresholdMeters(config.getThresholdMeters())
                    .dangerLevelMeters(config.getDangerLevelMeters())
                    .fullReservoirLevelMeters(config.getFullReservoirLevelMeters())
                    .status(config.getStatus().name())
                    .version(config.getVersion())
                    .effectiveFrom(effectiveFromStr)
                    .build();
        }

        // Fallback to unverified default from DamCurrentStatus
        Optional<DamCurrentStatus> statusOpt = damCurrentStatusRepository.findByDamId(damId);
        String fallbackEffectiveFrom = dam.getCreatedAt() != null
                ? dam.getCreatedAt().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : now.atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        return MlOverflowConfigResponse.builder()
                .damId(dam.getId())
                .verifiedThresholdMeters(null)
                .dangerLevelMeters(statusOpt.map(DamCurrentStatus::getDangerLevelMeters).orElse(null))
                .fullReservoirLevelMeters(statusOpt.map(DamCurrentStatus::getFullReservoirLevelMeters).orElse(null))
                .status("unverified")
                .version(1)
                .effectiveFrom(fallbackEffectiveFrom)
                .build();
    }

    public List<DamOverflowConfig> getConfigHistory(Long damId) {
        if (!damRepository.existsById(damId)) {
            throw new ResourceNotFoundException("Dam not found with id: " + damId);
        }
        return damOverflowConfigRepository.findByDamIdOrderByVersionDesc(damId);
    }

    @Transactional
    public MlOverflowConfigResponse createConfig(
            Long damId, CreateOverflowConfigRequest request, Long verifiedBy
    ) {
        Dam dam = damRepository.findById(damId)
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + damId));

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        LocalDateTime effectiveFrom = request.getEffectiveFrom() != null
                ? request.getEffectiveFrom()
                : now;

        int nextVersion = damOverflowConfigRepository.findTopByDamIdOrderByVersionDesc(damId)
                .map(c -> c.getVersion() + 1)
                .orElse(1);

        // Deactivate previous active configuration
        damOverflowConfigRepository.findActiveConfigByDamId(damId, now)
                .ifPresent(existing -> {
                    existing.setIsActive(false);
                    existing.setEffectiveTo(effectiveFrom);
                    damOverflowConfigRepository.save(existing);
                });

        DamOverflowConfig newConfig = DamOverflowConfig.builder()
                .dam(dam)
                .version(nextVersion)
                .thresholdMeters(request.getThresholdMeters())
                .crestLevelMeters(request.getCrestLevelMeters())
                .fullReservoirLevelMeters(request.getFullReservoirLevelMeters())
                .dangerLevelMeters(request.getDangerLevelMeters())
                .description(request.getDescription())
                .status(request.getStatus() != null ? request.getStatus() : DamOverflowConfig.OverflowConfigStatus.verified)
                .verifiedBy(verifiedBy)
                .effectiveFrom(effectiveFrom)
                .isActive(true)
                .build();

        DamOverflowConfig saved = damOverflowConfigRepository.save(newConfig);

        log.info("Created overflow config version {} for dam ID {}", saved.getVersion(), damId);

        String effectiveFromStr = saved.getEffectiveFrom().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
        return MlOverflowConfigResponse.builder()
                .damId(dam.getId())
                .verifiedThresholdMeters(saved.getThresholdMeters())
                .dangerLevelMeters(saved.getDangerLevelMeters())
                .fullReservoirLevelMeters(saved.getFullReservoirLevelMeters())
                .status(saved.getStatus().name())
                .version(saved.getVersion())
                .effectiveFrom(effectiveFromStr)
                .build();
    }
}

