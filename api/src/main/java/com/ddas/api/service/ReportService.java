package com.ddas.api.service;

import com.ddas.api.dto.request.report.AssignReportRequest;
import com.ddas.api.dto.request.report.CreateReportRequest;
import com.ddas.api.dto.request.report.MediaItemRequest;
import com.ddas.api.dto.request.report.UpdateReportStatusRequest;
import com.ddas.api.dto.response.report.ReportListResponse;
import com.ddas.api.dto.response.report.ReportResponse;
import com.ddas.api.dto.response.report.ReportStatsResponse;
import com.ddas.api.entity.*;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.ReportMapper;
import com.ddas.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final ReportTypeRepository reportTypeRepository;
    private final ReportMediaRepository reportMediaRepository;
    private final ReportStatusHistoryRepository statusHistoryRepository;
    private final DamRepository damRepository;
    private final RegionRepository regionRepository;
    private final UserRepository userRepository;
    private final ReportMapper reportMapper;

    // ===================== CREATE =====================

    @Transactional
    public ReportResponse createReport(CreateReportRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        ReportType reportType = reportTypeRepository.findById(request.getReportTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Report type not found with id: " + request.getReportTypeId()));

        Dam dam = null;
        if (request.getDamId() != null) {
            dam = damRepository.findById(request.getDamId())
                    .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + request.getDamId()));
        }

        Region region = null;
        if (request.getRegionId() != null) {
            region = regionRepository.findById(request.getRegionId())
                    .orElseThrow(() -> new ResourceNotFoundException("Region not found with id: " + request.getRegionId()));
        }

        String uuid = UUID.randomUUID().toString();
        String reportNumber = generateReportNumber();

        Report report = reportMapper.toReportEntity(request, user, reportType, dam, region, uuid, reportNumber);

        // Save report first to get ID
        report = reportRepository.save(report);

        // Save media items
        if (request.getMedia() != null && !request.getMedia().isEmpty()) {
            int order = 0;
            for (MediaItemRequest mediaRequest : request.getMedia()) {
                ReportMedia media = reportMapper.toReportMediaEntity(mediaRequest, report, user);
                media.setDisplayOrder(order++);
                reportMediaRepository.save(media);
            }
        }

        // Create initial status history entry
        ReportStatusHistory history = ReportStatusHistory.builder()
                .report(report)
                .previousStatus(null)
                .newStatus(Report.ReportStatus.pending)
                .notes("Report created")
                .changedBy(user)
                .build();
        statusHistoryRepository.save(history);

        log.info("Report created: {} by user: {}", reportNumber, userId);

        // Reload with relationships
        Report savedReport = reportRepository.findById(report.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Report not found after save"));
        return reportMapper.toReportResponse(savedReport);
    }

    // ===================== READ =====================

    @Transactional(readOnly = true)
    public ReportResponse getReportById(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));
        if (report.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Report not found (deleted)");
        }
        return reportMapper.toReportResponse(report);
    }

    @Transactional(readOnly = true)
    public Page<ReportListResponse> getAllReports(Pageable pageable, String status,
                                                   Long reportTypeId, Long damId, String priority) {
        Report.ReportStatus statusEnum = status != null ? Report.ReportStatus.valueOf(status) : null;
        ReportType.Priority priorityEnum = priority != null ? ReportType.Priority.valueOf(priority) : null;

        return reportRepository.findAllWithFilters(statusEnum, reportTypeId, damId, priorityEnum, pageable)
                .map(reportMapper::toReportListResponse);
    }

    @Transactional(readOnly = true)
    public Page<ReportListResponse> getMyReports(Long userId, Pageable pageable) {
        return reportRepository.findByUserIdAndDeletedAtIsNull(userId, pageable)
                .map(reportMapper::toReportListResponse);
    }

    @Transactional(readOnly = true)
    public Page<ReportListResponse> getReportsByDam(Long damId, Pageable pageable) {
        if (!damRepository.existsById(damId)) {
            throw new ResourceNotFoundException("Dam not found with id: " + damId);
        }
        return reportRepository.findByDamIdAndDeletedAtIsNull(damId, pageable)
                .map(reportMapper::toReportListResponse);
    }

    @Transactional(readOnly = true)
    public Page<ReportListResponse> getAssignedReports(Long userId, Pageable pageable) {
        return reportRepository.findByAssignedToIdAndDeletedAtIsNull(userId, pageable)
                .map(reportMapper::toReportListResponse);
    }

    @Transactional(readOnly = true)
    public ReportStatsResponse getReportStats() {
        return ReportStatsResponse.builder()
                .totalReports(reportRepository.countByDeletedAtIsNull())
                .pendingCount(reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.pending))
                .reviewingCount(reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.reviewing))
                .inProgressCount(reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.in_progress))
                .resolvedCount(reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.resolved))
                .rejectedCount(reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.rejected))
                .duplicateCount(reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.duplicate))
                .build();
    }

    // ===================== UPDATE =====================

    @Transactional
    public ReportResponse updateReportStatus(Long id, UpdateReportStatusRequest request, Long userId) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));

        if (report.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Report not found (deleted)");
        }

        User changedBy = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Report.ReportStatus previousStatus = report.getStatus();
        Report.ReportStatus newStatus;
        try {
            newStatus = Report.ReportStatus.valueOf(request.getStatus());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + request.getStatus());
        }

        report.setStatus(newStatus);

        // Handle status-specific fields
        if (newStatus == Report.ReportStatus.resolved) {
            report.setResolvedAt(LocalDateTime.now());
            report.setResolvedBy(changedBy);
            if (request.getResolutionNotes() != null) {
                report.setResolutionNotes(request.getResolutionNotes());
            }
            if (request.getResolutionNotesSi() != null) {
                report.setResolutionNotesSi(request.getResolutionNotesSi());
            }
        } else if (newStatus == Report.ReportStatus.rejected) {
            if (request.getRejectionReason() != null) {
                report.setRejectionReason(request.getRejectionReason());
            }
        }

        reportRepository.save(report);

        // Log status change
        ReportStatusHistory history = ReportStatusHistory.builder()
                .report(report)
                .previousStatus(previousStatus)
                .newStatus(newStatus)
                .notes(request.getNotes())
                .changedBy(changedBy)
                .build();
        statusHistoryRepository.save(history);

        log.info("Report {} status changed: {} -> {} by user: {}", report.getReportNumber(), previousStatus, newStatus, userId);

        return reportMapper.toReportResponse(report);
    }

    @Transactional
    public ReportResponse assignReport(Long id, AssignReportRequest request, Long adminUserId) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));

        if (report.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Report not found (deleted)");
        }

        User assignedTo = userRepository.findById(request.getAssignedToUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getAssignedToUserId()));

        User assignedBy = userRepository.findById(adminUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin user not found with id: " + adminUserId));

        report.setAssignedTo(assignedTo);
        report.setAssignedBy(assignedBy);
        report.setAssignedAt(LocalDateTime.now());

        // Auto-change status to reviewing if still pending
        if (report.getStatus() == Report.ReportStatus.pending) {
            Report.ReportStatus previousStatus = report.getStatus();
            report.setStatus(Report.ReportStatus.reviewing);

            ReportStatusHistory history = ReportStatusHistory.builder()
                    .report(report)
                    .previousStatus(previousStatus)
                    .newStatus(Report.ReportStatus.reviewing)
                    .notes("Report assigned to " + assignedTo.getFullName())
                    .changedBy(assignedBy)
                    .build();
            statusHistoryRepository.save(history);
        }

        reportRepository.save(report);

        log.info("Report {} assigned to user: {} by admin: {}", report.getReportNumber(), request.getAssignedToUserId(), adminUserId);

        return reportMapper.toReportResponse(report);
    }

    // ===================== DELETE =====================

    @Transactional
    public void deleteReport(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));
        report.setDeletedAt(LocalDateTime.now());
        reportRepository.save(report);
        log.info("Report {} soft deleted", report.getReportNumber());
    }

    // ===================== HELPERS =====================

    private synchronized String generateReportNumber() {
        int year = Year.now().getValue();
        String prefix = String.format("RPT-%d-", year);
        int maxSeq;
        try {
            maxSeq = reportRepository.findMaxReportSequence(prefix + "%");
        } catch (Exception e) {
            maxSeq = 0;
        }
        return String.format("RPT-%d-%05d", year, maxSeq + 1);
    }
}
