package com.ddas.api.controller;

import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.service.MlAdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/ml")
@RequiredArgsConstructor
public class MlAdminController {

    private final MlAdminService mlAdminService;

    @PostMapping("/jobs")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> createJob(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(ApiResponse.success(mlAdminService.createJob(body)));
    }

    @GetMapping("/jobs/{id}")
    @PreAuthorize("hasAuthority('dams.view') or hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> getJob(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(mlAdminService.getJob(id)));
    }

    @GetMapping("/jobs")
    @PreAuthorize("hasAuthority('dams.view') or hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> listJobs() {
        return ResponseEntity.ok(ApiResponse.success(mlAdminService.listJobs()));
    }

    @GetMapping("/releases")
    @PreAuthorize("hasAuthority('dams.view') or hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> getReleases() {
        return ResponseEntity.ok(ApiResponse.success(mlAdminService.getReleases()));
    }

    @GetMapping("/active-release")
    @PreAuthorize("hasAuthority('dams.view') or hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> getActiveRelease() {
        return ResponseEntity.ok(ApiResponse.success(mlAdminService.getActiveRelease()));
    }

    @PutMapping("/active-release")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> updateActiveRelease(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.success(mlAdminService.updateActiveRelease(body)));
    }

    @GetMapping("/monitoring")
    @PreAuthorize("hasAuthority('dams.view') or hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> getMonitoring() {
        return ResponseEntity.ok(ApiResponse.success(mlAdminService.getMonitoring()));
    }

    @PostMapping("/forecast-cycle")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> runForecastCycle() {
        return ResponseEntity.ok(ApiResponse.success(mlAdminService.runForecastCycle()));
    }

    @GetMapping("/evaluation")
    @PreAuthorize("hasAuthority('dams.view') or hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<Object>> getForecastEvaluation(
            @RequestParam(value = "damId", required = false) Long damId,
            @RequestParam(value = "horizon", required = false) Integer horizon
    ) {
        return ResponseEntity.ok(ApiResponse.success(mlAdminService.getForecastEvaluation(damId, horizon)));
    }
}

