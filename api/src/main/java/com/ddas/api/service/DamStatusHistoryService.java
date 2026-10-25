package com.ddas.api.service;

import com.ddas.api.entity.Dam;
import com.ddas.api.entity.DamCurrentStatus;
import com.ddas.api.entity.DamStatusHistory;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.DamCurrentStatusRepository;
import com.ddas.api.repository.DamRepository;
import com.ddas.api.repository.DamStatusHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DamStatusHistoryService {

    private final DamRepository damRepository;
    private final DamCurrentStatusRepository damCurrentStatusRepository;
    private final DamStatusHistoryRepository damStatusHistoryRepository;

    @Transactional
    public DamStatusHistory recordSnapshot(DamCurrentStatus status) {
        if (status == null || status.getDam() == null) {
            return null;
        }

        LocalDateTime recordedAt = status.getLastSensorReadingAt() != null
                ? status.getLastSensorReadingAt()
                : (status.getLastUpdated() != null ? status.getLastUpdated() : LocalDateTime.now(ZoneOffset.UTC));

        DamStatusHistory history = DamStatusHistory.builder()
                .dam(status.getDam())
                .waterLevelMeters(status.getWaterLevelMeters())
                .waterLevelPercentage(status.getWaterLevelPercentage())
                .fullReservoirLevelMeters(status.getFullReservoirLevelMeters())
                .dangerLevelMeters(status.getDangerLevelMeters())
                .inflowCumecs(status.getInflowCumecs())
                .outflowCumecs(status.getOutflowCumecs())
                .storageCurrentMcm(status.getStorageCurrentMcm())
                .storagePercentage(status.getStoragePercentage())
                .spillwayGateStatus(status.getSpillwayGateStatus())
                .gatesOpenCount(status.getGatesOpenCount())
                .totalGatesCount(status.getTotalGatesCount())
                .hazardStatus(status.getHazardStatus())
                .hazardValue(status.getHazardValue())
                .floodRiskScore(status.getFloodRiskScore())
                .activeHazardZones(status.getActiveHazardZones())
                .rainfallLast1hrMm(status.getRainfallLast1hrMm())
                .rainfallLast24hrMm(status.getRainfallLast24hrMm())
                .rainfallForecast24hrMm(status.getRainfallForecast24hrMm())
                .recordedAt(recordedAt)
                .build();

        return damStatusHistoryRepository.save(history);
    }

    @Transactional
    public DamStatusHistory recordSnapshotForDam(Long damId) {
        DamCurrentStatus status = damCurrentStatusRepository.findByDamId(damId)
                .orElseThrow(() -> new ResourceNotFoundException("Status not found for dam: " + damId));
        return recordSnapshot(status);
    }

    public List<DamStatusHistory> getHistoryForExport(
            Long damId, LocalDateTime from, LocalDateTime to, Long cursorId, Pageable pageable
    ) {
        if (!damRepository.existsById(damId)) {
            throw new ResourceNotFoundException("Dam not found with id: " + damId);
        }
        return damStatusHistoryRepository.findHistoryForExport(damId, from, to, cursorId, pageable);
    }
}

