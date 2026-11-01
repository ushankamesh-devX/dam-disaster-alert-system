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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DamOverflowConfigServiceTest {

    @Mock
    private DamRepository damRepository;

    @Mock
    private DamCurrentStatusRepository damCurrentStatusRepository;

    @Mock
    private DamOverflowConfigRepository damOverflowConfigRepository;

    @InjectMocks
    private DamOverflowConfigService service;

    private Dam sampleDam;

    @BeforeEach
    void setUp() {
        sampleDam = Dam.builder()
                .id(1L)
                .code("DAM-VIC-001")
                .name("Victoria Dam")
                .createdAt(LocalDateTime.of(2026, 1, 1, 0, 0))
                .build();
    }

    @Test
    void getActiveConfigReturnsActiveVerifiedConfigWhenPresent() {
        when(damRepository.findById(1L)).thenReturn(Optional.of(sampleDam));

        DamOverflowConfig config = DamOverflowConfig.builder()
                .id(10L)
                .dam(sampleDam)
                .version(2)
                .thresholdMeters(new BigDecimal("438.50"))
                .crestLevelMeters(new BigDecimal("438.00"))
                .dangerLevelMeters(new BigDecimal("437.00"))
                .fullReservoirLevelMeters(new BigDecimal("435.00"))
                .status(DamOverflowConfig.OverflowConfigStatus.verified)
                .effectiveFrom(LocalDateTime.of(2026, 6, 1, 0, 0))
                .isActive(true)
                .build();

        when(damOverflowConfigRepository.findActiveConfigByDamId(eq(1L), any(LocalDateTime.class)))
                .thenReturn(Optional.of(config));

        MlOverflowConfigResponse response = service.getActiveConfig(1L);

        assertThat(response.getDamId()).isEqualTo(1L);
        assertThat(response.getVersion()).isEqualTo(2);
        assertThat(response.getVerifiedThresholdMeters()).isEqualTo(new BigDecimal("438.50"));
        assertThat(response.getStatus()).isEqualTo("verified");
    }

    @Test
    void getActiveConfigReturnsUnverifiedDefaultsWhenNoActiveConfig() {
        when(damRepository.findById(1L)).thenReturn(Optional.of(sampleDam));
        when(damOverflowConfigRepository.findActiveConfigByDamId(eq(1L), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        DamCurrentStatus status = DamCurrentStatus.builder()
                .id(20L)
                .dam(sampleDam)
                .dangerLevelMeters(new BigDecimal("438.00"))
                .fullReservoirLevelMeters(new BigDecimal("435.00"))
                .build();
        when(damCurrentStatusRepository.findByDamId(1L)).thenReturn(Optional.of(status));

        MlOverflowConfigResponse response = service.getActiveConfig(1L);

        assertThat(response.getDamId()).isEqualTo(1L);
        assertThat(response.getVerifiedThresholdMeters()).isNull();
        assertThat(response.getStatus()).isEqualTo("unverified");
        assertThat(response.getVersion()).isEqualTo(1);
        assertThat(response.getDangerLevelMeters()).isEqualTo(new BigDecimal("438.00"));
    }

    @Test
    void createConfigDeactivatesPreviousAndCreatesNewVersion() {
        when(damRepository.findById(1L)).thenReturn(Optional.of(sampleDam));

        DamOverflowConfig activeConfig = DamOverflowConfig.builder()
                .id(10L)
                .dam(sampleDam)
                .version(1)
                .thresholdMeters(new BigDecimal("438.00"))
                .isActive(true)
                .build();

        when(damOverflowConfigRepository.findTopByDamIdOrderByVersionDesc(1L))
                .thenReturn(Optional.of(activeConfig));
        when(damOverflowConfigRepository.findActiveConfigByDamId(eq(1L), any(LocalDateTime.class)))
                .thenReturn(Optional.of(activeConfig));

        when(damOverflowConfigRepository.save(any(DamOverflowConfig.class)))
                .thenAnswer(inv -> {
                    DamOverflowConfig c = inv.getArgument(0);
                    if (c.getId() == null) c.setId(11L);
                    return c;
                });

        CreateOverflowConfigRequest request = CreateOverflowConfigRequest.builder()
                .thresholdMeters(new BigDecimal("438.50"))
                .crestLevelMeters(new BigDecimal("438.00"))
                .dangerLevelMeters(new BigDecimal("437.00"))
                .fullReservoirLevelMeters(new BigDecimal("435.00"))
                .description("Updated after crest inspection")
                .status(DamOverflowConfig.OverflowConfigStatus.verified)
                .build();

        MlOverflowConfigResponse response = service.createConfig(1L, request, 5L);

        assertThat(response.getVersion()).isEqualTo(2);
        assertThat(response.getVerifiedThresholdMeters()).isEqualTo(new BigDecimal("438.50"));
        assertThat(response.getStatus()).isEqualTo("verified");

        assertThat(activeConfig.getIsActive()).isFalse();
        assertThat(activeConfig.getEffectiveTo()).isNotNull();
    }
}

