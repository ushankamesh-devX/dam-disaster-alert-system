package com.ddas.api.controller;

import com.ddas.api.dto.request.report.CreateReportTypeRequest;
import com.ddas.api.dto.request.report.UpdateReportTypeRequest;
import com.ddas.api.dto.response.report.ReportTypeResponse;
import com.ddas.api.service.ReportTypeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/report-types")
@RequiredArgsConstructor
public class ReportTypeController {

    private final ReportTypeService reportTypeService;

    /** GET /api/v1/report-types */
    @GetMapping
    public ResponseEntity<List<ReportTypeResponse>> getAllReportTypes() {
        return ResponseEntity.ok(reportTypeService.getAllReportTypes());
    }

    /** GET /api/v1/report-types/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ReportTypeResponse> getReportTypeById(@PathVariable Long id) {
        return ResponseEntity.ok(reportTypeService.getReportTypeById(id));
    }

    /** GET /api/v1/report-types/category/{category} */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<ReportTypeResponse>> getReportTypesByCategory(@PathVariable String category) {
        return ResponseEntity.ok(reportTypeService.getReportTypesByCategory(category));
    }

    /** POST /api/v1/report-types */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAuthority('reports.manage')")
    public ResponseEntity<ReportTypeResponse> createReportType(@Valid @RequestBody CreateReportTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reportTypeService.createReportType(request));
    }

    /** PUT /api/v1/report-types/{id} */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAuthority('reports.manage')")
    public ResponseEntity<ReportTypeResponse> updateReportType(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReportTypeRequest request) {
        return ResponseEntity.ok(reportTypeService.updateReportType(id, request));
    }

    /** DELETE /api/v1/report-types/{id} */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAuthority('reports.manage')")
    public ResponseEntity<Void> deleteReportType(@PathVariable Long id) {
        reportTypeService.deleteReportType(id);
        return ResponseEntity.noContent().build();
    }
}

