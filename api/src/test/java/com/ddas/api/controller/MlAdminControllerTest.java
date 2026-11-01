package com.ddas.api.controller;

import com.ddas.api.exception.GlobalExceptionHandler;
import com.ddas.api.service.MlAdminService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MlAdminControllerTest {

    private MockMvc mockMvc;

    @Mock
    private MlAdminService mlAdminService;

    @InjectMocks
    private MlAdminController controller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void createJob_returnsAccepted() throws Exception {
        when(mlAdminService.createJob(any())).thenReturn(Map.of("job_id", "job_123", "status", "pending"));

        mockMvc.perform(post("/api/v1/admin/ml/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"job_type\": \"train\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.job_id").value("job_123"))
                .andExpect(jsonPath("$.data.status").value("pending"));
    }

    @Test
    void getJob_returnsJob() throws Exception {
        when(mlAdminService.getJob(eq("job_123"))).thenReturn(Map.of("job_id", "job_123", "status", "running"));

        mockMvc.perform(get("/api/v1/admin/ml/jobs/job_123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.job_id").value("job_123"))
                .andExpect(jsonPath("$.data.status").value("running"));
    }

    @Test
    void getReleases_returnsReleases() throws Exception {
        when(mlAdminService.getReleases()).thenReturn(Map.of("releases", "test"));

        mockMvc.perform(get("/api/v1/admin/ml/releases"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.releases").value("test"));
    }

    @Test
    void getMonitoring_returnsMonitoring() throws Exception {
        when(mlAdminService.getMonitoring()).thenReturn(Map.of("overall_status", "ok"));

        mockMvc.perform(get("/api/v1/admin/ml/monitoring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.overall_status").value("ok"));
    }
}

