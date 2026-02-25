package com.ddas.api.controller;

import com.ddas.api.dto.response.HazardLevelResponse;
import com.ddas.api.service.HazardLevelService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/hazard-levels")
@RequiredArgsConstructor
public class HazardLevelController {
    
    private final HazardLevelService hazardLevelService;
    
    @GetMapping
    public ResponseEntity<Page<HazardLevelResponse>> getAllHazardLevels(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(hazardLevelService.getAllHazardLevels(pageable));
    }
    
    @GetMapping("/list")
    public ResponseEntity<List<HazardLevelResponse>> getAllHazardLevelsList() {
        return ResponseEntity.ok(hazardLevelService.getAllHazardLevelsList());
    }
    
    @GetMapping("/active")
    public ResponseEntity<List<HazardLevelResponse>> getActiveHazardLevels() {
        return ResponseEntity.ok(hazardLevelService.getActiveHazardLevels());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<HazardLevelResponse> getHazardLevelById(@PathVariable Long id) {
        return ResponseEntity.ok(hazardLevelService.getHazardLevelById(id));
    }
    
    @GetMapping("/code/{code}")
    public ResponseEntity<HazardLevelResponse> getHazardLevelByCode(@PathVariable String code) {
        return ResponseEntity.ok(hazardLevelService.getHazardLevelByCode(code));
    }
    
    @GetMapping("/level/{levelNumber}")
    public ResponseEntity<HazardLevelResponse> getHazardLevelByNumber(@PathVariable Integer levelNumber) {
        return ResponseEntity.ok(hazardLevelService.getHazardLevelByNumber(levelNumber));
    }
    
    @GetMapping("/evacuation-required")
    public ResponseEntity<List<HazardLevelResponse>> getEvacuationRequiredLevels() {
        return ResponseEntity.ok(hazardLevelService.getEvacuationRequiredLevels());
    }
}
