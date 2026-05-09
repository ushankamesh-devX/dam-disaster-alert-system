package com.ddas.api.controller;

import com.ddas.api.dto.response.report.ReportTypeResponse;
import com.ddas.api.service.ReportTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/report-types")
@RequiredArgsConstructor
public class ReportTypeController {

    private final ReportTypeService reportTypeService;

    /** GET /api/v1/report-types — Get all active report types */
    @GetMapping
    public ResponseEntity<List<ReportTypeResponse>> getAllReportTypes() {
        return ResponseEntity.ok(reportTypeService.getAllActiveReportTypes());
    }

    /** GET /api/v1/report-types/{id} — Get single report type */
    @GetMapping("/{id}")
    public ResponseEntity<ReportTypeResponse> getReportTypeById(@PathVariable Long id) {
        return ResponseEntity.ok(reportTypeService.getReportTypeById(id));
    }

    /** GET /api/v1/report-types/category/{category} — Get types by category */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<ReportTypeResponse>> getReportTypesByCategory(@PathVariable String category) {
        return ResponseEntity.ok(reportTypeService.getReportTypesByCategory(category));
    }
}
