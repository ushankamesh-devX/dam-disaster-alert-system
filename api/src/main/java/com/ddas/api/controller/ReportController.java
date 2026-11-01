package com.ddas.api.controller;

import com.ddas.api.dto.request.report.AssignReportRequest;
import com.ddas.api.dto.request.report.UpdateReportStatusRequest;
import com.ddas.api.dto.response.report.ReportListResponse;
import com.ddas.api.dto.response.report.ReportResponse;
import com.ddas.api.dto.response.report.ReportStatsResponse;
import com.ddas.api.security.UserPrincipal;
import com.ddas.api.service.ReportMediaStorageService;
import com.ddas.api.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final ReportMediaStorageService reportMediaStorageService;

    // =========================================================================
    // ADMIN ENDPOINTS
    // =========================================================================

    /** GET /api/v1/reports?page=0&size=15&status=&priority=&reportTypeId=&damId= */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAuthority('reports.view')")
    public ResponseEntity<Page<ReportListResponse>> getReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long reportTypeId,
            @RequestParam(required = false) Long damId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(reportService.getReports(pageable, status, priority, reportTypeId, damId));
    }

    /** GET /api/v1/reports/stats */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAuthority('reports.view')")
    public ResponseEntity<ReportStatsResponse> getReportStats() {
        return ResponseEntity.ok(reportService.getReportStats());
    }

    /** GET /api/v1/reports/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ReportResponse> getReportById(@PathVariable Long id) {
        return ResponseEntity.ok(reportService.getReportById(id));
    }

    /** PATCH /api/v1/reports/{id}/status */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAuthority('reports.manage')")
    public ResponseEntity<ReportResponse> updateReportStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateReportStatusRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(reportService.updateReportStatus(id, request, userPrincipal.getUser()));
    }

    /** PATCH /api/v1/reports/{id}/assign */
    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAuthority('reports.manage')")
    public ResponseEntity<ReportResponse> assignReport(
            @PathVariable Long id,
            @Valid @RequestBody AssignReportRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(reportService.assignReport(id, request, userPrincipal.getUser()));
    }

    /** DELETE /api/v1/reports/{id} */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or hasAuthority('reports.manage')")
    public ResponseEntity<Void> deleteReport(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        reportService.deleteReport(id, userPrincipal.getUser());
        return ResponseEntity.noContent().build();
    }

    // =========================================================================
    // MOBILE ENDPOINTS (Logged-in users)
    // =========================================================================

    /** POST /api/v1/reports (Multipart form upload) */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ReportResponse> createReport(
            @RequestParam(value = "dam", required = false) String dam,
            @RequestParam(value = "damName", required = false) String damName,
            @RequestParam(value = "issueType", required = false) String issueType,
            @RequestParam(value = "description") String description,
            @RequestParam(value = "latitude", required = false) BigDecimal latitude,
            @RequestParam(value = "longitude", required = false) BigDecimal longitude,
            @RequestParam(value = "locationDescription", required = false) String locationDescription,
            @RequestParam(value = "isAnonymous", required = false, defaultValue = "false") Boolean isAnonymous,
            @RequestParam(value = "photos", required = false) List<MultipartFile> photos,
            @RequestParam(value = "videos", required = false) List<MultipartFile> videos,
            @RequestParam(value = "files", required = false) List<MultipartFile> files,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        List<MultipartFile> allFiles = new ArrayList<>();
        if (photos != null) allFiles.addAll(photos);
        if (videos != null) allFiles.addAll(videos);
        if (files != null) allFiles.addAll(files);

        String resolvedDamParam = dam != null && !dam.isBlank() ? dam : damName;
        ReportResponse response = reportService.createReport(
                userPrincipal.getUser(),
                resolvedDamParam,
                issueType,
                description,
                latitude,
                longitude,
                locationDescription,
                isAnonymous,
                allFiles
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** GET /api/v1/reports/mine */
    @GetMapping("/mine")
    public ResponseEntity<Page<ReportResponse>> getMyReports(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(reportService.getMyReports(userPrincipal.getUser().getId(), pageable));
    }

    // =========================================================================
    // MEDIA ENDPOINT
    // =========================================================================

    /** GET /api/v1/reports/media/{filename:.+} */
    @GetMapping("/media/{filename:.+}")
    public ResponseEntity<byte[]> getMedia(@PathVariable String filename) {
        byte[] data = reportMediaStorageService.downloadMedia(filename);
        String contentType = reportMediaStorageService.probeContentType(filename);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                .body(data);
    }
}

