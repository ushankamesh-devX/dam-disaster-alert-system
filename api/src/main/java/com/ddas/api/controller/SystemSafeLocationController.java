package com.ddas.api.controller;

import com.ddas.api.dto.request.BulkUpsertSystemSafeLocationsRequest;
import com.ddas.api.dto.request.CreateSystemSafeLocationRequest;
import com.ddas.api.dto.request.UpdateSystemSafeLocationRequest;
import com.ddas.api.dto.response.SystemSafeLocationResponse;
import com.ddas.api.service.SystemSafeLocationService;
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
@RequestMapping("/api/v1/system-safe-locations")
@RequiredArgsConstructor
public class SystemSafeLocationController {

    private final SystemSafeLocationService service;

    @GetMapping
    public ResponseEntity<Page<SystemSafeLocationResponse>> getAll(
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(service.getAll(pageable));
    }

    @GetMapping("/list")
    public ResponseEntity<List<SystemSafeLocationResponse>> getAllList() {
        return ResponseEntity.ok(service.getAllList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SystemSafeLocationResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping("/uuid/{uuid}")
    public ResponseEntity<SystemSafeLocationResponse> getByUuid(@PathVariable String uuid) {
        return ResponseEntity.ok(service.getByUuid(uuid));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('dams.create')")
    public ResponseEntity<SystemSafeLocationResponse> create(@Valid @RequestBody CreateSystemSafeLocationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<SystemSafeLocationResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSystemSafeLocationRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('dams.delete')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/uuid/{uuid}")
    @PreAuthorize("hasAuthority('dams.delete')")
    public ResponseEntity<Void> deleteByUuid(@PathVariable String uuid) {
        service.deleteByUuid(uuid);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/bulk-upsert")
    @PreAuthorize("hasAuthority('dams.edit')")
    public ResponseEntity<List<SystemSafeLocationResponse>> bulkUpsert(
            @Valid @RequestBody BulkUpsertSystemSafeLocationsRequest request) {
        return ResponseEntity.ok(service.bulkUpsert(request));
    }
}
