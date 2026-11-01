package com.ddas.api.service;

import com.ddas.api.dto.response.ml.*;
import com.ddas.api.entity.*;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.DamCurrentStatusRepository;
import com.ddas.api.repository.DamRepository;
import com.ddas.api.repository.SensorReadingRepository;
import com.ddas.api.repository.SensorRepository;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MlInternalDataServiceTest {

    @Mock
    private DamRepository damRepository;

    @Mock
    private SensorRepository sensorRepository;

    @Mock
    private SensorReadingRepository sensorReadingRepository;

    @Mock
    private DamCurrentStatusRepository damCurrentStatusRepository;

    @Mock
    private DamOverflowConfigService damOverflowConfigService;

    @Mock
    private DamStatusHistoryService damStatusHistoryService;

    @Mock
    private DamWeatherService damWeatherService;

    @Mock
    private DamForecastService damForecastService;

    @InjectMocks
    private MlInternalDataService service;

    private Dam sampleDam;

    @BeforeEach
    void setUp() {
        sampleDam = Dam.builder()
                .id(1L)
                .code("DAM-VIC-001")
                .name("Victoria Dam")
                .status(Dam.DamStatus.operational)
                .damType(Dam.DamType.arch)
                .latitude(new BigDecimal("7.23456700"))
                .longitude(new BigDecimal("80.78910100"))
                .build();
    }

    @Test
    void getMlDamsMapsDamsCorrectly() {
        when(damRepository.findAllWithRegion()).thenReturn(List.of(sampleDam));

        MlDataListResponse<MlDamMetadataResponse> response = service.getMlDams();

        assertThat(response.getData()).hasSize(1);
        MlDamMetadataResponse dto = response.getData().get(0);
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getCode()).isEqualTo("DAM-VIC-001");
        assertThat(dto.getIsMlEnabled()).isTrue();
    }

    @Test
    void getDamSensorsThrowsWhenDamNotFound() {
        when(damRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> service.getDamSensors(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Dam not found");
    }

    @Test
    void getDamSensorsReturnsMappedSensorsWithRolesAndReferenceLevels() {
        when(damRepository.existsById(1L)).thenReturn(true);
        SensorType type = SensorType.builder()
                .id(5L)
                .code("WATER_LEVEL")
                .name("Water Level Sensor")
                .unit("m")
                .build();
        Sensor sensor = Sensor.builder()
                .id(10L)
                .sensorUid("SEN-VIC-01")
                .dam(sampleDam)
                .sensorType(type)
                .sensorRole(Sensor.SensorRole.reservoir_level)
                .elevationMeters(new BigDecimal("400.00"))
                .referenceLevelMeters(new BigDecimal("400.00"))
                .isMlFeature(true)
                .locationOnDam("Reservoir")
                .status(Sensor.SensorStatus.active)
                .build();

        when(sensorRepository.findByDamIdWithSensorType(1L)).thenReturn(List.of(sensor));

        MlDataListResponse<MlSensorResponse> response = service.getDamSensors(1L);

        assertThat(response.getData()).hasSize(1);
        MlSensorResponse dto = response.getData().get(0);
        assertThat(dto.getSensorUid()).isEqualTo("SEN-VIC-01");
        assertThat(dto.getUnit()).isEqualTo("m");
        assertThat(dto.getSensorRole()).isEqualTo("reservoir_level");
        assertThat(dto.getReferenceLevelMeters()).isEqualTo(new BigDecimal("400.00"));
        assertThat(dto.getIsMlFeature()).isTrue();
    }

    @Test
    void getDamReadingsValidatesTimeBounds() {
        when(damRepository.existsById(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.getDamReadings(1L, null, "2026-10-02T00:00:00Z", null, 10))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> service.getDamReadings(1L, "not-a-date", "2026-10-02T00:00:00Z", null, 10))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> service.getDamReadings(1L, "2026-10-05T00:00:00Z", "2026-10-01T00:00:00Z", null, 10))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must not be after end");
    }

    @Test
    void getDamReadingsHandlesCursorPagination() {
        when(damRepository.existsById(1L)).thenReturn(true);

        SensorReading r1 = SensorReading.builder()
                .id(101L)
                .readingValue(new BigDecimal("435.10"))
                .recordedAt(LocalDateTime.of(2026, 10, 1, 10, 0))
                .build();
        SensorReading r2 = SensorReading.builder()
                .id(102L)
                .readingValue(new BigDecimal("435.20"))
                .recordedAt(LocalDateTime.of(2026, 10, 1, 11, 0))
                .build();
        SensorReading r3 = SensorReading.builder()
                .id(103L)
                .readingValue(new BigDecimal("435.30"))
                .recordedAt(LocalDateTime.of(2026, 10, 1, 12, 0))
                .build();

        when(sensorReadingRepository.findReadingsForExport(eq(1L), any(), any(), eq(100L), any(Pageable.class)))
                .thenReturn(List.of(r1, r2, r3));

        MlCursorPageResponse<MlReadingResponse> page = service.getDamReadings(
                1L, "2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z", "100", 2
        );

        assertThat(page.getData()).hasSize(2);
        assertThat(page.getNextCursor()).isEqualTo("102");
    }

    @Test
    void getDamStatusReturnsStatus() {
        when(damRepository.existsById(1L)).thenReturn(true);
        DamCurrentStatus status = DamCurrentStatus.builder()
                .id(20L)
                .dam(sampleDam)
                .waterLevelMeters(new BigDecimal("435.25"))
                .dangerLevelMeters(new BigDecimal("438.00"))
                .build();

        when(damCurrentStatusRepository.findByDamId(1L)).thenReturn(Optional.of(status));

        MlDataResponse<MlStatusResponse> response = service.getDamStatus(1L);

        assertThat(response.getData().getWaterLevelMeters()).isEqualTo(new BigDecimal("435.25"));
        assertThat(response.getData().getDangerLevelMeters()).isEqualTo(new BigDecimal("438.00"));
    }

    @Test
    void getDamOverflowConfigDelegatesToConfigService() {
        when(damRepository.existsById(1L)).thenReturn(true);
        MlOverflowConfigResponse config = MlOverflowConfigResponse.builder()
                .damId(1L)
                .verifiedThresholdMeters(new BigDecimal("438.50"))
                .status("verified")
                .version(2)
                .build();
        when(damOverflowConfigService.getActiveConfig(1L)).thenReturn(config);

        MlDataResponse<MlOverflowConfigResponse> response = service.getDamOverflowConfig(1L);

        assertThat(response.getData().getDamId()).isEqualTo(1L);
        assertThat(response.getData().getVerifiedThresholdMeters()).isEqualTo(new BigDecimal("438.50"));
        assertThat(response.getData().getStatus()).isEqualTo("verified");
    }

    @Test
    void getDamStatusHistoryReturnsCursorPagedSnapshots() {
        when(damRepository.existsById(1L)).thenReturn(true);

        DamStatusHistory h1 = DamStatusHistory.builder()
                .id(501L)
                .dam(sampleDam)
                .waterLevelMeters(new BigDecimal("435.10"))
                .recordedAt(LocalDateTime.of(2026, 10, 1, 10, 0))
                .build();
        DamStatusHistory h2 = DamStatusHistory.builder()
                .id(502L)
                .dam(sampleDam)
                .waterLevelMeters(new BigDecimal("435.20"))
                .recordedAt(LocalDateTime.of(2026, 10, 1, 11, 0))
                .build();
        DamStatusHistory h3 = DamStatusHistory.builder()
                .id(503L)
                .dam(sampleDam)
                .waterLevelMeters(new BigDecimal("435.30"))
                .recordedAt(LocalDateTime.of(2026, 10, 1, 12, 0))
                .build();

        when(damStatusHistoryService.getHistoryForExport(eq(1L), any(), any(), eq(500L), any(Pageable.class)))
                .thenReturn(List.of(h1, h2, h3));

        MlCursorPageResponse<MlStatusResponse> page = service.getDamStatusHistory(
                1L, "2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z", "500", 2
        );

        assertThat(page.getData()).hasSize(2);
        assertThat(page.getNextCursor()).isEqualTo("502");
        assertThat(page.getData().get(0).getId()).isEqualTo(501L);
    }

    @Test
    void getDamWeatherReturnsCursorPagedWeatherData() {
        when(damRepository.existsById(1L)).thenReturn(true);

        DamWeatherData w1 = DamWeatherData.builder()
                .id(701L)
                .dam(sampleDam)
                .provider("open-meteo")
                .precipitationMm(new BigDecimal("1.50"))
                .validTime(LocalDateTime.of(2026, 10, 1, 10, 0))
                .fetchTime(LocalDateTime.of(2026, 10, 1, 10, 0))
                .build();
        DamWeatherData w2 = DamWeatherData.builder()
                .id(702L)
                .dam(sampleDam)
                .provider("open-meteo")
                .precipitationMm(new BigDecimal("3.00"))
                .validTime(LocalDateTime.of(2026, 10, 1, 11, 0))
                .fetchTime(LocalDateTime.of(2026, 10, 1, 10, 0))
                .build();

        when(damWeatherService.getWeatherForExport(eq(1L), any(), any(), any(), eq(700L), any(Pageable.class)))
                .thenReturn(List.of(w1, w2));

        MlCursorPageResponse<MlWeatherDataResponse> page = service.getDamWeather(
                1L, "2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z", "2026-10-01T12:00:00Z", "700", 2
        );

        assertThat(page.getData()).hasSize(2);
        assertThat(page.getNextCursor()).isNull();
        assertThat(page.getData().get(0).getId()).isEqualTo(701L);
        assertThat(page.getData().get(0).getProvider()).isEqualTo("open-meteo");
    }
}
