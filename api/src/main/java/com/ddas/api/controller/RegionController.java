package com.ddas.api.controller;

import com.ddas.api.dto.request.CreateRegionRequest;
import com.ddas.api.dto.request.UpdateRegionRequest;
import com.ddas.api.dto.response.RegionResponse;
import com.ddas.api.service.RegionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/regions")
@RequiredArgsConstructor
public class RegionController {
    
    private final RegionService regionService;
    
    @GetMapping
    public ResponseEntity<Page<RegionResponse>> getAllRegions(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(regionService.getAllRegions(pageable));
    }
    
    @GetMapping("/list")
    public ResponseEntity<List<RegionResponse>> getAllRegionsList() {
        return ResponseEntity.ok(regionService.getAllRegionsList());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<RegionResponse> getRegionById(@PathVariable Long id) {
        return ResponseEntity.ok(regionService.getRegionById(id));
    }
    
    @GetMapping("/country/{country}")
    public ResponseEntity<List<RegionResponse>> getRegionsByCountry(@PathVariable String country) {
        return ResponseEntity.ok(regionService.getRegionsByCountry(country));
    }
    
    @GetMapping("/state/{stateProvince}")
    public ResponseEntity<List<RegionResponse>> getRegionsByStateProvince(@PathVariable String stateProvince) {
        return ResponseEntity.ok(regionService.getRegionsByStateProvince(stateProvince));
    }
    
    @PostMapping
    @PreAuthorize("hasAuthority('dams.create')")
    public ResponseEntity<RegionResponse> createRegion(@Valid @RequestBody CreateRegionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(regionService.createRegion(request));
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<RegionResponse> updateRegion(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRegionRequest request) {
        return ResponseEntity.ok(regionService.updateRegion(id, request));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.delete')")
    public ResponseEntity<Void> deleteRegion(@PathVariable Long id) {
        regionService.deleteRegion(id);
        return ResponseEntity.noContent().build();
    }
}
