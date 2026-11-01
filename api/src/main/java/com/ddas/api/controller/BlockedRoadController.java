package com.ddas.api.controller;

import com.ddas.api.entity.BlockedRoad;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.BlockedRoadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Admin-drawn areas that evacuation routes avoid (flooded roads, landslides, bridges out).
 */
@RestController
@RequestMapping("/api/v1/blocked-roads")
@RequiredArgsConstructor
public class BlockedRoadController {

    private final BlockedRoadRepository repository;

    @GetMapping
    public ResponseEntity<List<BlockedRoad>> getAll() {
        return ResponseEntity.ok(repository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/active")
    public ResponseEntity<List<BlockedRoad>> getActive() {
        return ResponseEntity.ok(repository.findCurrentlyBlocked(LocalDateTime.now()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<BlockedRoad> create(@RequestBody BlockedRoad road) {
        road.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(repository.save(road));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<BlockedRoad> update(@PathVariable Long id, @RequestBody BlockedRoad road) {
        BlockedRoad existing = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Blocked road not found with id: " + id));
        existing.setName(road.getName());
        existing.setReason(road.getReason());
        existing.setBoundaryGeojson(road.getBoundaryGeojson());
        existing.setIsActive(road.getIsActive());
        existing.setExpiresAt(road.getExpiresAt());
        return ResponseEntity.ok(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
