package com.ddas.api.service;

import com.ddas.api.entity.Dam;
import com.ddas.api.entity.DamForecast;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.DamForecastRepository;
import com.ddas.api.repository.DamRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DamForecastServiceTest {

    @Mock
    private DamRepository damRepository;

    @Mock
    private DamForecastRepository damForecastRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private DamForecastService damForecastService;

    private Dam sampleDam;
    private DamForecast sampleForecast;
    private LocalDateTime now;

    @BeforeEach
    void setUp() {
        now = LocalDateTime.of(2026, 10, 24, 12, 0);
        sampleDam = Dam.builder().id(1L).name("Victoria Dam").build();
        sampleForecast = DamForecast.builder()
                .dam(sampleDam)
                .issuedAt(now)
                .asOf(now)
                .horizonHours(1)
                .targetTime(now.plusHours(1))
                .levelP10(BigDecimal.valueOf(101.5))
                .levelP50(BigDecimal.valueOf(102.0))
                .levelP90(BigDecimal.valueOf(102.5))
                .overflowProbability(BigDecimal.valueOf(0.05))
                .isPublished(true)
                .build();
    }

    @Test
    void saveOrUpdateForecast_createsNewWhenNotExists() {
        when(damForecastRepository.findByDamIdAndAsOfAndHorizonHours(1L, now, 1))
                .thenReturn(Optional.empty());
        when(damForecastRepository.save(any(DamForecast.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DamForecast result = damForecastService.saveOrUpdateForecast(sampleForecast);

        assertThat(result).isNotNull();
        assertThat(result.getLevelP50()).isEqualTo(BigDecimal.valueOf(102.0));
        verify(damForecastRepository).save(sampleForecast);
    }

    @Test
    void saveOrUpdateForecast_updatesExistingWhenAlreadyExists() {
        DamForecast existing = DamForecast.builder()
                .id(100L)
                .dam(sampleDam)
                .asOf(now)
                .horizonHours(1)
                .levelP50(BigDecimal.valueOf(100.0))
                .build();

        when(damForecastRepository.findByDamIdAndAsOfAndHorizonHours(1L, now, 1))
                .thenReturn(Optional.of(existing));
        when(damForecastRepository.save(any(DamForecast.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DamForecast result = damForecastService.saveOrUpdateForecast(sampleForecast);

        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getLevelP50()).isEqualTo(BigDecimal.valueOf(102.0));
        verify(damForecastRepository).save(existing);
    }

    @Test
    void getLatestForecasts_success() {
        when(damRepository.existsById(1L)).thenReturn(true);
        when(damForecastRepository.findLatestPublishedForecastsByDamId(1L))
                .thenReturn(List.of(sampleForecast));

        List<DamForecast> results = damForecastService.getLatestForecasts(1L);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getHorizonHours()).isEqualTo(1);
    }

    @Test
    void getLatestForecasts_throwsWhenDamNotFound() {
        when(damRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> damForecastService.getLatestForecasts(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Dam not found");
    }

    @Test
    void getForecastsForExport_delegatesToRepository() {
        PageRequest page = PageRequest.of(0, 10);
        when(damForecastRepository.findForecastsForExport(1L, now, now.plusDays(1), 50L, page))
                .thenReturn(List.of(sampleForecast));

        List<DamForecast> results = damForecastService.getForecastsForExport(1L, now, now.plusDays(1), 50L, page);

        assertThat(results).hasSize(1);
        verify(damForecastRepository).findForecastsForExport(1L, now, now.plusDays(1), 50L, page);
    }
}

