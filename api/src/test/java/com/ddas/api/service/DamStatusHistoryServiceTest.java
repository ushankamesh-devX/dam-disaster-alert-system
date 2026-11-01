package com.ddas.api.service;

import com.ddas.api.entity.Dam;
import com.ddas.api.entity.DamCurrentStatus;
import com.ddas.api.entity.DamStatusHistory;
import com.ddas.api.repository.DamCurrentStatusRepository;
import com.ddas.api.repository.DamRepository;
import com.ddas.api.repository.DamStatusHistoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DamStatusHistoryServiceTest {

    @Mock
    private DamRepository damRepository;

    @Mock
    private DamCurrentStatusRepository damCurrentStatusRepository;

    @Mock
    private DamStatusHistoryRepository damStatusHistoryRepository;

    @InjectMocks
    private DamStatusHistoryService service;

    private Dam sampleDam;

    @BeforeEach
    void setUp() {
        sampleDam = Dam.builder()
                .id(1L)
                .code("DAM-VIC-001")
                .name("Victoria Dam")
                .build();
    }

    @Test
    void recordSnapshotCapturesStatusFields() {
        DamCurrentStatus status = DamCurrentStatus.builder()
                .id(10L)
                .dam(sampleDam)
                .waterLevelMeters(new BigDecimal("435.50"))
                .waterLevelPercentage(new BigDecimal("92.5"))
                .dangerLevelMeters(new BigDecimal("438.00"))
                .fullReservoirLevelMeters(new BigDecimal("435.00"))
                .inflowCumecs(new BigDecimal("120.00"))
                .outflowCumecs(new BigDecimal("50.00"))
                .hazardStatus(Dam.HazardStatus.safe)
                .lastSensorReadingAt(LocalDateTime.of(2026, 10, 1, 12, 0))
                .build();

        when(damStatusHistoryRepository.save(any(DamStatusHistory.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DamStatusHistory saved = service.recordSnapshot(status);

        assertThat(saved).isNotNull();
        assertThat(saved.getDam()).isEqualTo(sampleDam);
        assertThat(saved.getWaterLevelMeters()).isEqualTo(new BigDecimal("435.50"));
        assertThat(saved.getWaterLevelPercentage()).isEqualTo(new BigDecimal("92.5"));
        assertThat(saved.getRecordedAt()).isEqualTo(LocalDateTime.of(2026, 10, 1, 12, 0));
    }

    @Test
    void recordSnapshotForDamLoadsStatusAndSaves() {
        DamCurrentStatus status = DamCurrentStatus.builder()
                .id(10L)
                .dam(sampleDam)
                .waterLevelMeters(new BigDecimal("436.00"))
                .build();

        when(damCurrentStatusRepository.findByDamId(1L)).thenReturn(Optional.of(status));
        when(damStatusHistoryRepository.save(any(DamStatusHistory.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DamStatusHistory saved = service.recordSnapshotForDam(1L);

        assertThat(saved).isNotNull();
        assertThat(saved.getWaterLevelMeters()).isEqualTo(new BigDecimal("436.00"));
        verify(damCurrentStatusRepository).findByDamId(1L);
        verify(damStatusHistoryRepository).save(any(DamStatusHistory.class));
    }

    @Test
    void getHistoryForExportDelegatesToRepository() {
        when(damRepository.existsById(1L)).thenReturn(true);
        LocalDateTime from = LocalDateTime.of(2026, 10, 1, 0, 0);
        LocalDateTime to = LocalDateTime.of(2026, 10, 2, 0, 0);

        DamStatusHistory historyItem = DamStatusHistory.builder()
                .id(100L)
                .dam(sampleDam)
                .waterLevelMeters(new BigDecimal("435.20"))
                .recordedAt(from)
                .build();

        when(damStatusHistoryRepository.findHistoryForExport(eq(1L), eq(from), eq(to), any(), any(Pageable.class)))
                .thenReturn(List.of(historyItem));

        List<DamStatusHistory> result = service.getHistoryForExport(1L, from, to, null, Pageable.unpaged());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(100L);
    }
}

