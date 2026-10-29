package com.ddas.api.controller;

import com.ddas.api.dto.response.ml.*;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.GlobalExceptionHandler;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.service.MlInternalDataService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class MlInternalDataControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MlInternalDataService mlInternalDataService;

    @InjectMocks
    private MlInternalDataController controller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getDamsReturnsMlMetadataList() throws Exception {
        MlDamMetadataResponse dam = MlDamMetadataResponse.builder()
                .id(1L)
                .code("DAM-VIC-001")
                .name("Victoria Dam")
                .isMlEnabled(true)
                .build();

        when(mlInternalDataService.getMlDams()).thenReturn(new MlDataListResponse<>(List.of(dam)));

        mockMvc.perform(get("/api/v1/internal/ml/dams"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].code").value("DAM-VIC-001"))
                .andExpect(jsonPath("$.data[0].isMlEnabled").value(true));
    }

    @Test
    void getSensorsReturnsSensorsList() throws Exception {
        MlSensorResponse sensor = MlSensorResponse.builder()
                .id(10L)
                .sensorUid("SEN-VIC-WL-01")
                .damId(1L)
                .unit("m")
                .locationOnDam("Reservoir Level")
                .status("active")
                .build();

        when(mlInternalDataService.getDamSensors(1L)).thenReturn(new MlDataListResponse<>(List.of(sensor)));

        mockMvc.perform(get("/api/v1/internal/ml/dams/1/sensors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(10))
                .andExpect(jsonPath("$.data[0].sensorUid").value("SEN-VIC-WL-01"))
                .andExpect(jsonPath("$.data[0].locationOnDam").value("Reservoir Level"));
    }

    @Test
    void getReadingsReturnsCursorPagedData() throws Exception {
        MlReadingResponse reading = MlReadingResponse.builder()
                .id(100L)
                .sensorId(10L)
                .sensorUid("SEN-VIC-WL-01")
                .readingValue(new BigDecimal("435.50"))
                .unit("m")
                .quality("good")
                .recordedAt("2026-10-01T00:00:00Z")
                .receivedAt("2026-10-01T00:01:00Z")
                .build();

        when(mlInternalDataService.getDamReadings(eq(1L), anyString(), anyString(), any(), any()))
                .thenReturn(new MlCursorPageResponse<>(List.of(reading), "100"));

        mockMvc.perform(get("/api/v1/internal/ml/dams/1/readings")
                        .param("from", "2026-10-01T00:00:00+00:00")
                        .param("to", "2026-10-02T00:00:00+00:00")
                        .param("cursor", "50")
                        .param("limit", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(100))
                .andExpect(jsonPath("$.data[0].readingValue").value(435.50))
                .andExpect(jsonPath("$.nextCursor").value("100"));
    }

    @Test
    void getStatusReturnsLatestStoredStatus() throws Exception {
        MlStatusResponse status = MlStatusResponse.builder()
                .id(1L)
                .damId(1L)
                .waterLevelMeters(new BigDecimal("435.20"))
                .dangerLevelMeters(new BigDecimal("438.00"))
                .hazardStatus("safe")
                .build();

        when(mlInternalDataService.getDamStatus(1L)).thenReturn(new MlDataResponse<>(status));

        mockMvc.perform(get("/api/v1/internal/ml/dams/1/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.damId").value(1))
                .andExpect(jsonPath("$.data.waterLevelMeters").value(435.20))
                .andExpect(jsonPath("$.data.hazardStatus").value("safe"));
    }

    @Test
    void getOverflowConfigReturnsConfig() throws Exception {
        MlOverflowConfigResponse config = MlOverflowConfigResponse.builder()
                .damId(1L)
                .verifiedThresholdMeters(null)
                .dangerLevelMeters(new BigDecimal("438.00"))
                .fullReservoirLevelMeters(new BigDecimal("435.00"))
                .status("unverified")
                .version(1)
                .effectiveFrom("2026-01-01T00:00:00Z")
                .build();

        when(mlInternalDataService.getDamOverflowConfig(1L)).thenReturn(new MlDataResponse<>(config));

        mockMvc.perform(get("/api/v1/internal/ml/dams/1/overflow-config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.damId").value(1))
                .andExpect(jsonPath("$.data.status").value("unverified"))
                .andExpect(jsonPath("$.data.dangerLevelMeters").value(438.00));
    }

    @Test
    void getStatusHistoryReturnsEmptyCursorPageInitially() throws Exception {
        when(mlInternalDataService.getDamStatusHistory(eq(1L), any(), any(), any(), any()))
                .thenReturn(new MlCursorPageResponse<>(List.of(), null));

        mockMvc.perform(get("/api/v1/internal/ml/dams/1/status-history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.nextCursor").doesNotExist());
    }

    @Test
    void getForecastsReturnsEmptyCursorPageInitially() throws Exception {
        when(mlInternalDataService.getDamForecasts(eq(1L), any(), any(), any(), any()))
                .thenReturn(new MlCursorPageResponse<>(List.of(), null));

        mockMvc.perform(get("/api/v1/internal/ml/dams/1/forecasts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void getWeatherReturnsEmptyCursorPageInitially() throws Exception {
        when(mlInternalDataService.getDamWeather(eq(1L), any(), any(), any(), any(), any()))
                .thenReturn(new MlCursorPageResponse<>(List.of(), null));

        mockMvc.perform(get("/api/v1/internal/ml/dams/1/weather"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void getWeatherReturnsPagedData() throws Exception {
        MlWeatherDataResponse weather = MlWeatherDataResponse.builder()
                .id(701L)
                .damId(1L)
                .provider("open-meteo")
                .precipitationMm(new BigDecimal("2.50"))
                .temperatureC(new BigDecimal("28.00"))
                .build();

        when(mlInternalDataService.getDamWeather(eq(1L), anyString(), anyString(), any(), any(), any()))
                .thenReturn(new MlCursorPageResponse<>(List.of(weather), "701"));

        mockMvc.perform(get("/api/v1/internal/ml/dams/1/weather")
                        .param("from", "2026-10-01T00:00:00Z")
                        .param("to", "2026-10-02T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(701))
                .andExpect(jsonPath("$.data[0].provider").value("open-meteo"))
                .andExpect(jsonPath("$.data[0].precipitationMm").value(2.50))
                .andExpect(jsonPath("$.nextCursor").value("701"));
    }

    @Test
    void unknownDamReturnsNotFound() throws Exception {
        when(mlInternalDataService.getDamSensors(999L))
                .thenThrow(new ResourceNotFoundException("Dam not found with id: 999"));

        mockMvc.perform(get("/api/v1/internal/ml/dams/999/sensors"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Dam not found with id: 999"));
    }

    @Test
    void invalidDateBoundsReturnsBadRequest() throws Exception {
        when(mlInternalDataService.getDamReadings(eq(1L), anyString(), anyString(), any(), any()))
                .thenThrow(new BadRequestException("Reading start ('from') must not be after end ('to')."));

        mockMvc.perform(get("/api/v1/internal/ml/dams/1/readings")
                        .param("from", "2026-10-02T00:00:00+00:00")
                        .param("to", "2026-10-01T00:00:00+00:00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Reading start ('from') must not be after end ('to')."));
    }
}

