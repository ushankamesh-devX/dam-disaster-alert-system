package com.ddas.api.controller;

import com.ddas.api.dto.request.CreateOverflowConfigRequest;
import com.ddas.api.dto.response.ml.MlOverflowConfigResponse;
import com.ddas.api.exception.GlobalExceptionHandler;
import com.ddas.api.service.DamOverflowConfigService;
import com.ddas.api.service.DamService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class DamOverflowConfigControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private DamService damService;

    @Mock
    private DamOverflowConfigService damOverflowConfigService;

    @Mock
    private com.ddas.api.service.DamForecastService damForecastService;

    @Mock
    private com.ddas.api.service.MlInternalDataService mlInternalDataService;

    @InjectMocks
    private DamController damController;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders.standaloneSetup(damController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void getOverflowConfigReturnsActiveConfig() throws Exception {
        MlOverflowConfigResponse config = MlOverflowConfigResponse.builder()
                .damId(1L)
                .verifiedThresholdMeters(new BigDecimal("438.50"))
                .dangerLevelMeters(new BigDecimal("438.00"))
                .fullReservoirLevelMeters(new BigDecimal("435.00"))
                .status("verified")
                .version(1)
                .effectiveFrom("2026-01-01T00:00:00Z")
                .build();

        when(damOverflowConfigService.getActiveConfig(1L)).thenReturn(config);

        mockMvc.perform(get("/api/v1/dams/1/overflow-config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.damId").value(1))
                .andExpect(jsonPath("$.data.verifiedThresholdMeters").value(438.50))
                .andExpect(jsonPath("$.data.status").value("verified"));
    }

    @Test
    void updateOverflowConfigCreatesNewVersion() throws Exception {
        MlOverflowConfigResponse updated = MlOverflowConfigResponse.builder()
                .damId(1L)
                .verifiedThresholdMeters(new BigDecimal("439.00"))
                .status("verified")
                .version(2)
                .effectiveFrom("2026-10-24T12:00:00Z")
                .build();

        when(damOverflowConfigService.createConfig(eq(1L), any(CreateOverflowConfigRequest.class), any()))
                .thenReturn(updated);

        CreateOverflowConfigRequest request = CreateOverflowConfigRequest.builder()
                .thresholdMeters(new BigDecimal("439.00"))
                .crestLevelMeters(new BigDecimal("438.50"))
                .description("Crest reinforced")
                .build();

        mockMvc.perform(put("/api/v1/dams/1/overflow-config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.version").value(2))
                .andExpect(jsonPath("$.data.verifiedThresholdMeters").value(439.00));
    }
}

