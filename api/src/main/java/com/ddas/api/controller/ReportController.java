package com.ddas.api.controller;

import com.ddas.api.dto.request.report.AssignReportRequest;
import com.ddas.api.dto.request.report.CreateReportRequest;
import com.ddas.api.dto.request.report.UpdateReportStatusRequest;
import com.ddas.api.dto.response.report.ReportListResponse;
import com.ddas.api.dto.response.report.ReportResponse;
import com.ddas.api.dto.response.report.ReportStatsResponse;
import com.ddas.api.security.UserPrincipal;
import com.ddas.api.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    /** POST /api/v1/reports — Create a new report */
    @PostMapping
    public ResponseEntity<ReportResponse> createReport(
            @Valid @RequestBody CreateReportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reportService.createReport(request, principal.getUser().getId()));
    }

    /** GET /api/v1/reports — List all reports (paginated, filterable) */
    @GetMapping
    public ResponseEntity<Page<ReportListResponse>> getAllReports(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long reportTypeId,
            @RequestParam(required = false) Long damId,
            @RequestParam(required = false) String priority,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(reportService.getAllReports(pageable, status, reportTypeId, damId, priority));
    }

    /** GET /api/v1/reports/{id} — Get report detail */
    @GetMapping("/{id}")
    public ResponseEntity<ReportResponse> getReportById(@PathVariable Long id) {
        return ResponseEntity.ok(reportService.getReportById(id));
    }

    /** GET /api/v1/reports/my — Get current user's reports */
    @GetMapping("/my")
    public ResponseEntity<Page<ReportListResponse>> getMyReports(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(reportService.getMyReports(principal.getUser().getId(), pageable));
    }

    /** GET /api/v1/reports/dam/{damId} — Reports for a specific dam */
    @GetMapping("/dam/{damId}")
    public ResponseEntity<Page<ReportListResponse>> getReportsByDam(
            @PathVariable Long damId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(reportService.getReportsByDam(damId, pageable));
    }

    /** GET /api/v1/reports/assigned — Reports assigned to current user */
    @GetMapping("/assigned")
    public ResponseEntity<Page<ReportListResponse>> getAssignedReports(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(reportService.getAssignedReports(principal.getUser().getId(), pageable));
    }

    /** GET /api/v1/reports/stats — Report statistics */
    @GetMapping("/stats")
    public ResponseEntity<ReportStatsResponse> getReportStats() {
        return ResponseEntity.ok(reportService.getReportStats());
    }

    /** PATCH /api/v1/reports/{id}/status — Update report status */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ReportResponse> updateReportStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReportStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(reportService.updateReportStatus(id, request, principal.getUser().getId()));
    }

    /** PATCH /api/v1/reports/{id}/assign — Assign report to user */
    @PatchMapping("/{id}/assign")
    public ResponseEntity<ReportResponse> assignReport(
            @PathVariable Long id,
            @Valid @RequestBody AssignReportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(reportService.assignReport(id, request, principal.getUser().getId()));
    }

    /** DELETE /api/v1/reports/{id} — Soft delete report */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable Long id) {
        reportService.deleteReport(id);
        return ResponseEntity.noContent().build();
    }
}
