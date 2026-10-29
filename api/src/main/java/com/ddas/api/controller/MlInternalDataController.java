package com.ddas.api.controller;

import com.ddas.api.dto.response.ml.*;
import com.ddas.api.service.MlInternalDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/internal/ml")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ml.data.read')")
public class MlInternalDataController {

    private final MlInternalDataService mlInternalDataService;

    @GetMapping("/dams")
    public ResponseEntity<MlDataListResponse<MlDamMetadataResponse>> getDams() {
        return ResponseEntity.ok(mlInternalDataService.getMlDams());
    }

    @GetMapping("/dams/{id}/sensors")
    public ResponseEntity<MlDataListResponse<MlSensorResponse>> getDamSensors(
            @PathVariable("id") Long id
    ) {
        return ResponseEntity.ok(mlInternalDataService.getDamSensors(id));
    }

    @GetMapping("/dams/{id}/readings")
    public ResponseEntity<MlCursorPageResponse<MlReadingResponse>> getDamReadings(
            @PathVariable("id") Long id,
            @RequestParam("from") String from,
            @RequestParam("to") String to,
            @RequestParam(value = "cursor", required = false) String cursor,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return ResponseEntity.ok(mlInternalDataService.getDamReadings(id, from, to, cursor, limit));
    }

    @GetMapping("/dams/{id}/status")
    public ResponseEntity<MlDataResponse<MlStatusResponse>> getDamStatus(
            @PathVariable("id") Long id
    ) {
        return ResponseEntity.ok(mlInternalDataService.getDamStatus(id));
    }

    @GetMapping("/dams/{id}/status-history")
    public ResponseEntity<MlCursorPageResponse<MlStatusResponse>> getDamStatusHistory(
            @PathVariable("id") Long id,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to,
            @RequestParam(value = "cursor", required = false) String cursor,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return ResponseEntity.ok(mlInternalDataService.getDamStatusHistory(id, from, to, cursor, limit));
    }

    @GetMapping("/dams/{id}/overflow-config")
    public ResponseEntity<MlDataResponse<MlOverflowConfigResponse>> getDamOverflowConfig(
            @PathVariable("id") Long id
    ) {
        return ResponseEntity.ok(mlInternalDataService.getDamOverflowConfig(id));
    }

    @GetMapping("/dams/{id}/forecasts")
    public ResponseEntity<MlCursorPageResponse<MlForecastResponse>> getDamForecasts(
            @PathVariable("id") Long id,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to,
            @RequestParam(value = "cursor", required = false) String cursor,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return ResponseEntity.ok(mlInternalDataService.getDamForecasts(id, from, to, cursor, limit));
    }

    @GetMapping("/dams/{id}/weather")
    public ResponseEntity<MlCursorPageResponse<MlWeatherDataResponse>> getDamWeather(
            @PathVariable("id") Long id,
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to,
            @RequestParam(value = "asOf", required = false) String asOf,
            @RequestParam(value = "cursor", required = false) String cursor,
            @RequestParam(value = "limit", required = false) Integer limit
    ) {
        return ResponseEntity.ok(mlInternalDataService.getDamWeather(id, from, to, asOf, cursor, limit));
    }
}
