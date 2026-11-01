package com.ddas.api.controller;

import com.ddas.api.service.DamForecastService;
import com.ddas.api.service.MlInternalDataService;
import com.ddas.api.dto.response.ml.MlForecastResponse;
import com.ddas.api.dto.response.ml.MlCursorPageResponse;
import com.ddas.api.entity.DamForecast;

import com.ddas.api.dto.request.*;
import com.ddas.api.dto.response.*;
import com.ddas.api.entity.Dam;
import com.ddas.api.service.DamService;
import com.ddas.api.service.DamOverflowConfigService;
import com.ddas.api.dto.request.CreateOverflowConfigRequest;
import com.ddas.api.dto.response.ml.MlOverflowConfigResponse;
import com.ddas.api.security.UserPrincipal;
import org.springframework.security.core.Authentication;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dams")
@RequiredArgsConstructor
public class DamController {
    
    private final DamService damService;
    private final DamOverflowConfigService damOverflowConfigService;
    private final DamForecastService damForecastService;
    private final MlInternalDataService mlInternalDataService;
    
    // ============== DAM CRUD ENDPOINTS ==============
    
    @GetMapping
    public ResponseEntity<Page<DamListResponse>> getAllDams(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(damService.getAllDams(pageable));
    }
    
    @GetMapping("/list")
    public ResponseEntity<List<DamListResponse>> getAllDamsList() {
        return ResponseEntity.ok(damService.getAllDamsList());
    }
    
    @GetMapping("/active")
    public ResponseEntity<List<DamListResponse>> getActiveDams() {
        return ResponseEntity.ok(damService.getActiveDams());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<DamResponse> getDamById(@PathVariable Long id) {
        return ResponseEntity.ok(damService.getDamById(id));
    }
    
    @GetMapping("/code/{code}")
    public ResponseEntity<DamResponse> getDamByCode(@PathVariable String code) {
        return ResponseEntity.ok(damService.getDamByCode(code));
    }
    
    @GetMapping("/search")
    public ResponseEntity<Page<DamListResponse>> searchDams(
            @RequestParam String q,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(damService.searchDams(q, pageable));
    }
    
    @GetMapping("/region/{regionId}")
    public ResponseEntity<List<DamListResponse>> getDamsByRegion(@PathVariable Long regionId) {
        return ResponseEntity.ok(damService.getDamsByRegion(regionId));
    }
    
    @GetMapping("/status/{status}")
    public ResponseEntity<List<DamListResponse>> getDamsByStatus(@PathVariable Dam.DamStatus status) {
        return ResponseEntity.ok(damService.getDamsByStatus(status));
    }
    
    @GetMapping("/hazard-status/{hazardStatus}")
    public ResponseEntity<List<DamListResponse>> getDamsByHazardStatus(@PathVariable Dam.HazardStatus hazardStatus) {
        return ResponseEntity.ok(damService.getDamsByHazardStatus(hazardStatus));
    }
    
    @GetMapping("/filter")
    public ResponseEntity<Page<DamListResponse>> filterDams(
            @RequestParam(required = false) Dam.DamStatus status,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Dam.HazardStatus hazardStatus,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(damService.filterDams(status, regionId, hazardStatus, pageable));
    }
    
    @PostMapping
    @PreAuthorize("hasAuthority('dams.create')")
    public ResponseEntity<DamResponse> createDam(@Valid @RequestBody CreateDamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(damService.createDam(request));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<DamResponse> updateDam(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDamRequest request) {
        return ResponseEntity.ok(damService.updateDam(id, request));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.delete')")
    public ResponseEntity<Void> deleteDam(@PathVariable Long id) {
        damService.deleteDam(id);
        return ResponseEntity.noContent().build();
    }
    
    // ============== DAM STATUS ENDPOINTS ==============
    
    @GetMapping("/{id}/status")
    public ResponseEntity<DamCurrentStatusResponse> getDamStatus(@PathVariable Long id) {
        return ResponseEntity.ok(damService.getDamStatus(id));
    }
    
    @GetMapping("/statuses")
    public ResponseEntity<List<DamCurrentStatusResponse>> getAllDamStatuses() {
        return ResponseEntity.ok(damService.getAllDamStatuses());
    }
    
    @GetMapping("/statuses/high-risk")
    public ResponseEntity<List<DamCurrentStatusResponse>> getHighRiskDamStatuses() {
        return ResponseEntity.ok(damService.getHighRiskDamStatuses());
    }
    
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<DamCurrentStatusResponse> updateDamStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDamStatusRequest request) {
        return ResponseEntity.ok(damService.updateDamStatus(id, request));
    }
    
    // ============== HAZARD ZONE ENDPOINTS ==============
    
    @GetMapping("/{id}/hazard-zones")
    public ResponseEntity<List<DamHazardZoneResponse>> getDamHazardZones(@PathVariable Long id) {
        return ResponseEntity.ok(damService.getDamHazardZones(id));
    }
    
    @GetMapping("/{id}/hazard-zones/active")
    public ResponseEntity<List<DamHazardZoneResponse>> getActiveHazardZones(@PathVariable Long id) {
        return ResponseEntity.ok(damService.getActiveHazardZones(id));
    }
    
    @GetMapping("/hazard-zones/{zoneId}")
    public ResponseEntity<DamHazardZoneResponse> getHazardZoneById(@PathVariable Long zoneId) {
        return ResponseEntity.ok(damService.getHazardZoneById(zoneId));
    }
    
    @PostMapping("/hazard-zones")
    @PreAuthorize("hasAuthority('dams.create')")
    public ResponseEntity<DamHazardZoneResponse> createHazardZone(@Valid @RequestBody CreateHazardZoneRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(damService.createHazardZone(request));
    }
    
    @PutMapping("/hazard-zones/{zoneId}")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<DamHazardZoneResponse> updateHazardZone(
            @PathVariable Long zoneId,
            @Valid @RequestBody UpdateHazardZoneRequest request) {
        return ResponseEntity.ok(damService.updateHazardZone(zoneId, request));
    }
    
    @DeleteMapping("/hazard-zones/{zoneId}")
    @PreAuthorize("hasAuthority('dams.delete')")
    public ResponseEntity<Void> deleteHazardZone(@PathVariable Long zoneId) {
        damService.deleteHazardZone(zoneId);
        return ResponseEntity.noContent().build();
    }
    
    // ============== GATE ENDPOINTS ==============
    
    @GetMapping("/{id}/gates")
    public ResponseEntity<List<DamGateResponse>> getDamGates(@PathVariable Long id) {
        return ResponseEntity.ok(damService.getDamGates(id));
    }
    
    @GetMapping("/{id}/gates/open")
    public ResponseEntity<List<DamGateResponse>> getOpenGates(@PathVariable Long id) {
        return ResponseEntity.ok(damService.getOpenGates(id));
    }
    
    @GetMapping("/gates/{gateId}")
    public ResponseEntity<DamGateResponse> getGateById(@PathVariable Long gateId) {
        return ResponseEntity.ok(damService.getGateById(gateId));
    }
    
    @PostMapping("/gates")
    @PreAuthorize("hasAuthority('dams.operate_gates')")
    public ResponseEntity<DamGateResponse> createGate(@Valid @RequestBody CreateDamGateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(damService.createGate(request));
    }
    
    @PutMapping("/gates/{gateId}")
    @PreAuthorize("hasAuthority('dams.operate_gates')")
    public ResponseEntity<DamGateResponse> updateGate(
            @PathVariable Long gateId,
            @Valid @RequestBody UpdateDamGateRequest request) {
        return ResponseEntity.ok(damService.updateGate(gateId, request));
    }
    
    @DeleteMapping("/gates/{gateId}")
    @PreAuthorize("hasAuthority('dams.delete')")
    public ResponseEntity<Void> deleteGate(@PathVariable Long gateId) {
        damService.deleteGate(gateId);
        return ResponseEntity.noContent().build();
    }
    
    // ============== STATISTICS ENDPOINTS ==============
    
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getDamStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalDams", damService.getTotalDamCount());
        stats.put("activeDams", damService.getActiveDamCount());
        return ResponseEntity.ok(stats);
    }
    
    @GetMapping("/statistics/region/{regionId}")
    public ResponseEntity<Map<String, Object>> getDamCountByRegion(@PathVariable Long regionId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("regionId", regionId);
        stats.put("damCount", damService.getDamCountByRegion(regionId));
        return ResponseEntity.ok(stats);
    }

    // ============== OVERFLOW CONFIG ENDPOINTS ==============

    @GetMapping("/{id}/overflow-config")
    public ResponseEntity<ApiResponse<MlOverflowConfigResponse>> getOverflowConfig(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(damOverflowConfigService.getActiveConfig(id)));
    }

    @PutMapping("/{id}/overflow-config")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<ApiResponse<MlOverflowConfigResponse>> updateOverflowConfig(
            @PathVariable Long id,
            @Valid @RequestBody CreateOverflowConfigRequest request,
            Authentication authentication
    ) {
        Long userId = (authentication != null && authentication.getPrincipal() instanceof UserPrincipal up)
                ? up.getUser().getId()
                : null;
        return ResponseEntity.ok(ApiResponse.success(damOverflowConfigService.createConfig(id, request, userId)));
    }

    // ============== FORECAST ENDPOINTS ==============

    @GetMapping("/{id}/forecasts")
    public ResponseEntity<ApiResponse<List<MlForecastResponse>>> getDamForecasts(@PathVariable Long id) {
        List<DamForecast> forecasts = damForecastService.getLatestForecasts(id);
        List<MlForecastResponse> dtoList = forecasts.stream()
                .map(f -> MlForecastResponse.builder()
                        .id(f.getId())
                        .damId(f.getDam().getId())
                        .issuedAt(f.getIssuedAt())
                        .asOf(f.getAsOf())
                        .latestReadingAt(f.getLatestReadingAt())
                        .freshness(f.getFreshness())
                        .demoMode(f.getDemoMode())
                        .releaseId(f.getReleaseId())
                        .overflowThresholdMeters(f.getOverflowThresholdMeters())
                        .overflowConfigVersion(f.getOverflowConfigVersion())
                        .horizonHours(f.getHorizonHours())
                        .targetTime(f.getTargetTime())
                        .levelP10(f.getLevelP10())
                        .levelP50(f.getLevelP50())
                        .levelP90(f.getLevelP90())
                        .overflowProbability(f.getOverflowProbability())
                        .overflowProbabilityReason(f.getOverflowProbabilityReason())
                        .isPublished(f.getIsPublished())
                        .createdAt(f.getCreatedAt())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.success(dtoList));
    }

    @GetMapping("/{id}/forecast-history")
    public ResponseEntity<ApiResponse<MlCursorPageResponse<MlForecastResponse>>> getDamForecastHistory(
            @PathVariable Long id,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to,
            @RequestParam(value = "cursor", required = false) String cursor,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                mlInternalDataService.getDamForecasts(id, from, to, cursor, limit)
        ));
    }
}
