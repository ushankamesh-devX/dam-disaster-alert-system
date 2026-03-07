package com.ddas.api.controller;

import com.ddas.api.dto.request.AlertTypeRequestDTO;
import com.ddas.api.dto.response.AlertTypeResponseDTO;
import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.service.AlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alert-types")
@RequiredArgsConstructor
public class AlertTypeController {

    private final AlertService alertService;

    @GetMapping
    @PreAuthorize("hasAuthority('alerts.view')")
    public ResponseEntity<ApiResponse<List<AlertTypeResponseDTO>>> getAllAlertTypes() {
        return ResponseEntity.ok(ApiResponse.success("Alert types retrieved", alertService.getAllAlertTypes()));
    }

    @GetMapping("/active")
    @PreAuthorize("hasAuthority('alerts.view')")
    public ResponseEntity<ApiResponse<List<AlertTypeResponseDTO>>> getActiveAlertTypes() {
        return ResponseEntity.ok(ApiResponse.success("Active alert types retrieved", alertService.getActiveAlertTypes()));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('alerts.edit')")
    public ResponseEntity<ApiResponse<AlertTypeResponseDTO>> createAlertType(@Valid @RequestBody AlertTypeRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Alert type created", alertService.createAlertType(request)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('alerts.edit')")
    public ResponseEntity<ApiResponse<AlertTypeResponseDTO>> updateAlertType(
            @PathVariable Long id, @Valid @RequestBody AlertTypeRequestDTO request) {
        return ResponseEntity.ok(ApiResponse.success("Alert type updated", alertService.updateAlertType(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('alerts.edit')")
    public ResponseEntity<ApiResponse<Void>> deleteAlertType(@PathVariable Long id) {
        alertService.deleteAlertType(id);
        return ResponseEntity.ok(ApiResponse.message("Alert type deactivated"));
    }
}
