package com.ddas.api.service;

import com.ddas.api.dto.request.report.AssignReportRequest;
import com.ddas.api.dto.request.report.UpdateReportStatusRequest;
import com.ddas.api.dto.response.report.ReportListResponse;
import com.ddas.api.dto.response.report.ReportResponse;
import com.ddas.api.dto.response.report.ReportStatsResponse;
import com.ddas.api.entity.*;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.ReportMapper;
import com.ddas.api.repository.DamRepository;
import com.ddas.api.repository.ReportMediaRepository;
import com.ddas.api.repository.ReportRepository;
import com.ddas.api.repository.ReportTypeRepository;
import com.ddas.api.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;
    private final ReportTypeRepository reportTypeRepository;
    private final ReportMediaRepository reportMediaRepository;
    private final DamRepository damRepository;
    private final UserRepository userRepository;
    private final ReportMediaStorageService reportMediaStorageService;
    private final ReportMapper reportMapper;

    @Transactional(readOnly = true)
    public Page<ReportListResponse> getReports(Pageable pageable, String status, String priority, Long reportTypeId, Long damId) {
        Specification<Report> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (status != null && !status.isBlank()) {
                try {
                    Report.ReportStatus reportStatus = Report.ReportStatus.valueOf(status.toLowerCase());
                    predicates.add(cb.equal(root.get("status"), reportStatus));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid status filter provided: {}", status);
                }
            }

            if (priority != null && !priority.isBlank()) {
                try {
                    Report.ReportPriority reportPriority = Report.ReportPriority.valueOf(priority.toLowerCase());
                    predicates.add(cb.equal(root.get("priority"), reportPriority));
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid priority filter provided: {}", priority);
                }
            }

            if (reportTypeId != null) {
                predicates.add(cb.equal(root.get("reportType").get("id"), reportTypeId));
            }

            if (damId != null) {
                predicates.add(cb.equal(root.get("dam").get("id"), damId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return reportRepository.findAll(spec, pageable).map(reportMapper::toReportListResponse);
    }

    @Transactional(readOnly = true)
    public ReportStatsResponse getReportStats() {
        long total = reportRepository.countByDeletedAtIsNull();
        long pending = reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.pending);
        long reviewing = reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.reviewing);
        long inProgress = reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.in_progress);
        long resolved = reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.resolved);
        long rejected = reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.rejected);
        long duplicate = reportRepository.countByStatusAndDeletedAtIsNull(Report.ReportStatus.duplicate);

        return ReportStatsResponse.builder()
                .totalReports(total)
                .pendingCount(pending)
                .reviewingCount(reviewing)
                .inProgressCount(inProgress)
                .resolvedCount(resolved)
                .rejectedCount(rejected)
                .duplicateCount(duplicate)
                .build();
    }

    @Transactional(readOnly = true)
    public ReportResponse getReportById(Long id) {
        Report report = reportRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));
        return reportMapper.toReportResponse(report);
    }

    @Transactional
    public ReportResponse updateReportStatus(Long id, UpdateReportStatusRequest request, User officer) {
        Report report = reportRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));

        Report.ReportStatus newStatus;
        try {
            newStatus = Report.ReportStatus.valueOf(request.getStatus().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + request.getStatus());
        }

        report.setStatus(newStatus);
        if (request.getNotes() != null) {
            report.setVerificationNotes(request.getNotes());
        }
        if (request.getRejectionReason() != null) {
            report.setRejectionReason(request.getRejectionReason());
        }
        if (request.getResolutionNotes() != null) {
            report.setResolutionNotes(request.getResolutionNotes());
        }

        if (newStatus == Report.ReportStatus.resolved) {
            report.setResolvedAt(LocalDateTime.now());
            report.setResolvedBy(officer);
        }

        Report saved = reportRepository.save(report);
        return reportMapper.toReportResponse(saved);
    }

    @Transactional
    public ReportResponse assignReport(Long id, AssignReportRequest request, User assignedBy) {
        Report report = reportRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));

        User targetOfficer = userRepository.findActiveUserById(request.getAssignedToUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Assigned user not found with id: " + request.getAssignedToUserId()));

        report.setAssignedTo(targetOfficer);
        report.setAssignedAt(LocalDateTime.now());
        report.setAssignedBy(assignedBy);

        Report saved = reportRepository.save(report);
        return reportMapper.toReportResponse(saved);
    }

    @Transactional
    public void deleteReport(Long id, User deletedBy) {
        Report report = reportRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id: " + id));

        report.setDeletedAt(LocalDateTime.now());
        reportRepository.save(report);
    }

    @Transactional
    public ReportResponse createReport(
            User reporter,
            String damParam,
            String issueTypeParam,
            String description,
            BigDecimal latitude,
            BigDecimal longitude,
            String locationDescription,
            Boolean isAnonymous,
            List<MultipartFile> files) {

        if (reporter == null) {
            throw new BadRequestException("User authentication required to submit report");
        }

        if (description == null || description.isBlank()) {
            throw new BadRequestException("Description is required");
        }

        Dam dam = resolveDam(damParam);
        ReportType reportType = resolveReportType(issueTypeParam);

        String damName = dam != null ? dam.getName() : (damParam != null ? damParam : "Unknown Dam");
        String typeName = reportType != null ? reportType.getName() : (issueTypeParam != null ? issueTypeParam : "General Issue");
        String title = typeName + " - " + damName;

        String uuid = UUID.randomUUID().toString();
        long nextNum = reportRepository.count() + 1;
        String reportNumber = String.format("RPT-%d-%05d", Year.now().getValue(), nextNum);

        Report report = Report.builder()
                .uuid(uuid)
                .reportNumber(reportNumber)
                .user(reporter)
                .isAnonymous(Boolean.TRUE.equals(isAnonymous))
                .reportType(reportType)
                .priority(Report.ReportPriority.medium)
                .dam(dam)
                .region(dam != null ? dam.getRegion() : null)
                .latitude(latitude)
                .longitude(longitude)
                .locationDescription(locationDescription)
                .title(title)
                .description(description.trim())
                .status(Report.ReportStatus.pending)
                .build();

        Report savedReport = reportRepository.save(report);

        if (files != null && !files.isEmpty()) {
            for (MultipartFile file : files) {
                if (file != null && !file.isEmpty()) {
                    ReportMediaStorageService.MediaUploadResult upload = reportMediaStorageService.uploadMedia(file);

                    ReportMedia.MediaType mediaType = upload.contentType().startsWith("video")
                            ? ReportMedia.MediaType.video
                            : ReportMedia.MediaType.image;

                    ReportMedia media = ReportMedia.builder()
                            .uuid(UUID.randomUUID().toString())
                            .report(savedReport)
                            .fileName(upload.fileName())
                            .filePath("report-media/" + upload.fileName())
                            .fileUrl(upload.relativeUrl())
                            .fileType(mediaType)
                            .mimeType(upload.contentType())
                            .fileSizeBytes(upload.size())
                            .uploadedBy(reporter)
                            .build();

                    reportMediaRepository.save(media);
                    savedReport.getMediaList().add(media);
                }
            }
        }

        return reportMapper.toReportResponse(savedReport);
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> getMyReports(Long userId, Pageable pageable) {
        return reportRepository.findByUserIdAndDeletedAtIsNull(userId, pageable)
                .map(reportMapper::toReportResponse);
    }

    private Dam resolveDam(String damParam) {
        if (damParam == null || damParam.isBlank()) {
            return null;
        }

        try {
            long damId = Long.parseLong(damParam.trim());
            return damRepository.findById(damId).orElse(null);
        } catch (NumberFormatException ignored) {
            // Not a numeric ID, search by name
            Page<Dam> found = damRepository.searchDams(damParam.trim(), Pageable.ofSize(1));
            if (!found.isEmpty()) {
                return found.getContent().get(0);
            }
            return null;
        }
    }

    private ReportType resolveReportType(String issueTypeParam) {
        if (issueTypeParam == null || issueTypeParam.isBlank()) {
            return reportTypeRepository.findByCode("other")
                    .orElseGet(() -> reportTypeRepository.findAll().stream().findFirst().orElse(null));
        }

        try {
            long typeId = Long.parseLong(issueTypeParam.trim());
            return reportTypeRepository.findById(typeId).orElse(null);
        } catch (NumberFormatException ignored) {
            return reportTypeRepository.findByCode(issueTypeParam.trim().toLowerCase())
                    .orElseGet(() -> reportTypeRepository.findByCode("other")
                            .orElseGet(() -> reportTypeRepository.findAll().stream().findFirst().orElse(null)));
        }
    }
}

