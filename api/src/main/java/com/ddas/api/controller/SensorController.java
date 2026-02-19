package com.ddas.api.controller;

import com.ddas.api.dto.request.CreateSensorReadingRequest;
import com.ddas.api.dto.request.CreateSensorRequest;
import com.ddas.api.dto.request.UpdateSensorRequest;
import com.ddas.api.dto.response.SensorReadingResponse;
import com.ddas.api.dto.response.SensorResponse;
import com.ddas.api.dto.response.SensorTypeResponse;
import com.ddas.api.entity.Sensor;
import com.ddas.api.service.SensorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/sensors")
@RequiredArgsConstructor
public class SensorController {
    
    private final SensorService sensorService;
    
    // ============== SENSOR TYPE ENDPOINTS ==============
    
    @GetMapping("/types")
    public ResponseEntity<List<SensorTypeResponse>> getAllSensorTypes() {
        return ResponseEntity.ok(sensorService.getAllSensorTypes());
    }
    
    @GetMapping("/types/{id}")
    public ResponseEntity<SensorTypeResponse> getSensorTypeById(@PathVariable Long id) {
        return ResponseEntity.ok(sensorService.getSensorTypeById(id));
    }
    
    @GetMapping("/types/code/{code}")
    public ResponseEntity<SensorTypeResponse> getSensorTypeByCode(@PathVariable String code) {
        return ResponseEntity.ok(sensorService.getSensorTypeByCode(code));
    }
    
    // ============== SENSOR CRUD ENDPOINTS ==============
    
    @GetMapping
    public ResponseEntity<Page<SensorResponse>> getAllSensors(@PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(sensorService.getAllSensors(pageable));
    }
    
    @GetMapping("/dam/{damId}")
    public ResponseEntity<List<SensorResponse>> getSensorsByDam(@PathVariable Long damId) {
        return ResponseEntity.ok(sensorService.getSensorsByDam(damId));
    }
    
    @GetMapping("/dam/{damId}/active")
    public ResponseEntity<List<SensorResponse>> getActiveSensorsByDam(@PathVariable Long damId) {
        return ResponseEntity.ok(sensorService.getActiveSensorsByDam(damId));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<SensorResponse> getSensorById(@PathVariable Long id) {
        return ResponseEntity.ok(sensorService.getSensorById(id));
    }
    
    @GetMapping("/uid/{sensorUid}")
    public ResponseEntity<SensorResponse> getSensorByUid(@PathVariable String sensorUid) {
        return ResponseEntity.ok(sensorService.getSensorByUid(sensorUid));
    }
    
    @GetMapping("/status/{status}")
    public ResponseEntity<List<SensorResponse>> getSensorsByStatus(@PathVariable Sensor.SensorStatus status) {
        return ResponseEntity.ok(sensorService.getSensorsByStatus(status));
    }
    
    @GetMapping("/type/{sensorTypeId}")
    public ResponseEntity<List<SensorResponse>> getSensorsByType(@PathVariable Long sensorTypeId) {
        return ResponseEntity.ok(sensorService.getSensorsByType(sensorTypeId));
    }
    
    @GetMapping("/dam/{damId}/problematic")
    public ResponseEntity<List<SensorResponse>> getProblematicSensorsByDam(@PathVariable Long damId) {
        return ResponseEntity.ok(sensorService.getProblematicSensorsByDam(damId));
    }
    
    @PostMapping
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<SensorResponse> createSensor(@Valid @RequestBody CreateSensorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sensorService.createSensor(request));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<SensorResponse> updateSensor(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSensorRequest request) {
        return ResponseEntity.ok(sensorService.updateSensor(id, request));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<Void> deleteSensor(@PathVariable Long id) {
        sensorService.deleteSensor(id);
        return ResponseEntity.noContent().build();
    }
    
    // ============== SENSOR READING ENDPOINTS ==============
    
    @GetMapping("/{sensorId}/readings")
    public ResponseEntity<Page<SensorReadingResponse>> getSensorReadings(
            @PathVariable Long sensorId,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(sensorService.getSensorReadings(sensorId, pageable));
    }
    
    @GetMapping("/{sensorId}/readings/range")
    public ResponseEntity<List<SensorReadingResponse>> getSensorReadingsInTimeRange(
            @PathVariable Long sensorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return ResponseEntity.ok(sensorService.getSensorReadingsInTimeRange(sensorId, startTime, endTime));
    }
    
    @GetMapping("/{sensorId}/readings/latest")
    public ResponseEntity<SensorReadingResponse> getLatestReading(@PathVariable Long sensorId) {
        return ResponseEntity.ok(sensorService.getLatestReading(sensorId));
    }
    
    @GetMapping("/dam/{damId}/readings/latest")
    public ResponseEntity<List<SensorReadingResponse>> getLatestReadingsForDam(@PathVariable Long damId) {
        return ResponseEntity.ok(sensorService.getLatestReadingsForDam(damId));
    }
    
    @PostMapping("/readings")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<SensorReadingResponse> createReading(@Valid @RequestBody CreateSensorReadingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sensorService.createReading(request));
    }
    
    @PostMapping("/readings/batch")
    @PreAuthorize("hasAuthority('dams.manage_sensors')")
    public ResponseEntity<List<SensorReadingResponse>> createBatchReadings(
            @Valid @RequestBody List<CreateSensorReadingRequest> requests) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sensorService.createBatchReadings(requests));
    }
    
    // ============== STATISTICS ENDPOINTS ==============
    
    @GetMapping("/{sensorId}/statistics")
    public ResponseEntity<Map<String, Object>> getSensorStatistics(
            @PathVariable Long sensorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        
        Double avg = sensorService.getAverageReading(sensorId, startTime, endTime);
        BigDecimal max = sensorService.getMaxReading(sensorId, startTime, endTime);
        BigDecimal min = sensorService.getMinReading(sensorId, startTime, endTime);
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("sensorId", sensorId);
        stats.put("startTime", startTime);
        stats.put("endTime", endTime);
        stats.put("average", avg);
        stats.put("maximum", max);
        stats.put("minimum", min);
        
        return ResponseEntity.ok(stats);
    }
    
    @GetMapping("/dam/{damId}/statistics")
    public ResponseEntity<Map<String, Object>> getDamSensorStatistics(@PathVariable Long damId) {
        Map<String, Object> stats = new HashMap<>();
        stats.put("damId", damId);
        stats.put("totalSensors", sensorService.getSensorCountByDam(damId));
        stats.put("activeSensors", sensorService.getActiveSensorCountByDam(damId));
        return ResponseEntity.ok(stats);
    }
}
