package com.ddas.api.mapper;

import com.ddas.api.dto.request.report.CreateReportRequest;
import com.ddas.api.dto.request.report.MediaItemRequest;
import com.ddas.api.dto.response.report.*;
import com.ddas.api.entity.*;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ReportMapper {

    // ============== REPORT TYPE MAPPINGS ==============

    public ReportTypeResponse toReportTypeResponse(ReportType type) {
        if (type == null) return null;

        ReportTypeResponse response = new ReportTypeResponse();
        response.setId(type.getId());
        response.setCode(type.getCode());
        response.setName(type.getName());
        response.setNameSi(type.getNameSi());
        response.setNameTa(type.getNameTa());
        response.setDescription(type.getDescription());
        response.setIcon(type.getIcon());
        response.setColor(type.getColor());
        response.setCategory(type.getCategory() != null ? type.getCategory().name() : null);
        response.setDefaultPriority(type.getDefaultPriority() != null ? type.getDefaultPriority().name() : null);
        response.setRequiresPhoto(type.getRequiresPhoto());
        response.setRequiresLocation(type.getRequiresLocation());
        response.setAutoAlertThreshold(type.getAutoAlertThreshold());
        response.setIsActive(type.getIsActive());
        response.setDisplayOrder(type.getDisplayOrder());
        response.setCreatedAt(type.getCreatedAt());
        response.setUpdatedAt(type.getUpdatedAt());
        return response;
    }

    public List<ReportTypeResponse> toReportTypeResponseList(List<ReportType> types) {
        if (types == null) return null;
        return types.stream().map(this::toReportTypeResponse).collect(Collectors.toList());
    }

    // ============== REPORT MEDIA MAPPINGS ==============

    public ReportMediaResponse toReportMediaResponse(ReportMedia media) {
        if (media == null) return null;

        ReportMediaResponse response = new ReportMediaResponse();
        response.setId(media.getId());
        response.setUuid(media.getUuid());
        response.setFileName(media.getFileName());
        response.setFilePath(media.getFilePath());
        response.setFileUrl(media.getFileUrl());
        response.setFileType(media.getFileType() != null ? media.getFileType().name() : null);
        response.setMimeType(media.getMimeType());
        response.setFileSizeBytes(media.getFileSizeBytes());
        response.setWidth(media.getWidth());
        response.setHeight(media.getHeight());
        response.setDurationSeconds(media.getDurationSeconds());
        response.setThumbnailUrl(media.getThumbnailUrl());
        response.setLatitude(media.getLatitude());
        response.setLongitude(media.getLongitude());
        response.setCapturedAt(media.getCapturedAt());
        response.setDisplayOrder(media.getDisplayOrder());
        response.setCaption(media.getCaption());
        response.setIsPrimary(media.getIsPrimary());
        response.setUploadedById(media.getUploadedBy() != null ? media.getUploadedBy().getId() : null);
        response.setCreatedAt(media.getCreatedAt());
        return response;
    }

    public List<ReportMediaResponse> toReportMediaResponseList(List<ReportMedia> mediaList) {
        if (mediaList == null) return Collections.emptyList();
        return mediaList.stream().map(this::toReportMediaResponse).collect(Collectors.toList());
    }

    // ============== REPORT STATUS HISTORY MAPPINGS ==============

    public ReportStatusHistoryResponse toReportStatusHistoryResponse(ReportStatusHistory history) {
        if (history == null) return null;

        ReportStatusHistoryResponse response = new ReportStatusHistoryResponse();
        response.setId(history.getId());
        response.setPreviousStatus(history.getPreviousStatus() != null ? history.getPreviousStatus().name() : null);
        response.setNewStatus(history.getNewStatus() != null ? history.getNewStatus().name() : null);
        response.setNotes(history.getNotes());
        response.setChangedById(history.getChangedBy() != null ? history.getChangedBy().getId() : null);
        response.setChangedByName(history.getChangedBy() != null ? history.getChangedBy().getFullName() : null);
        response.setCreatedAt(history.getCreatedAt());
        return response;
    }

    public List<ReportStatusHistoryResponse> toReportStatusHistoryResponseList(List<ReportStatusHistory> historyList) {
        if (historyList == null) return Collections.emptyList();
        return historyList.stream().map(this::toReportStatusHistoryResponse).collect(Collectors.toList());
    }

    // ============== REPORT FULL RESPONSE ==============

    public ReportResponse toReportResponse(Report report) {
        if (report == null) return null;

        ReportResponse response = new ReportResponse();
        response.setId(report.getId());
        response.setUuid(report.getUuid());
        response.setReportNumber(report.getReportNumber());

        // Reporter
        if (report.getUser() != null) {
            response.setUserId(report.getUser().getId());
            response.setUserName(Boolean.TRUE.equals(report.getIsAnonymous()) ? "Anonymous" : report.getUser().getFullName());
        }
        response.setIsAnonymous(report.getIsAnonymous());

        // Report type
        if (report.getReportType() != null) {
            response.setReportTypeId(report.getReportType().getId());
            response.setReportTypeCode(report.getReportType().getCode());
            response.setReportTypeName(report.getReportType().getName());
            response.setReportTypeIcon(report.getReportType().getIcon());
            response.setReportTypeColor(report.getReportType().getColor());
        }

        response.setPriority(report.getPriority() != null ? report.getPriority().name() : null);

        // Dam
        if (report.getDam() != null) {
            response.setDamId(report.getDam().getId());
            response.setDamName(report.getDam().getName());
        }

        // Region
        if (report.getRegion() != null) {
            response.setRegionId(report.getRegion().getId());
            response.setRegionName(report.getRegion().getName());
        }

        // Location
        response.setLatitude(report.getLatitude());
        response.setLongitude(report.getLongitude());
        response.setLocationDescription(report.getLocationDescription());
        response.setLocationDescriptionSi(report.getLocationDescriptionSi());

        // Content
        response.setTitle(report.getTitle());
        response.setDescription(report.getDescription());
        response.setDescriptionSi(report.getDescriptionSi());

        // Status
        response.setStatus(report.getStatus() != null ? report.getStatus().name() : null);

        // Assignment
        if (report.getAssignedTo() != null) {
            response.setAssignedToId(report.getAssignedTo().getId());
            response.setAssignedToName(report.getAssignedTo().getFullName());
        }
        response.setAssignedAt(report.getAssignedAt());
        response.setAssignedById(report.getAssignedBy() != null ? report.getAssignedBy().getId() : null);

        // Resolution
        response.setResolutionNotes(report.getResolutionNotes());
        response.setResolutionNotesSi(report.getResolutionNotesSi());
        response.setResolvedAt(report.getResolvedAt());
        response.setResolvedById(report.getResolvedBy() != null ? report.getResolvedBy().getId() : null);
        response.setRejectionReason(report.getRejectionReason());

        // Verification
        response.setIsVerified(report.getIsVerified());
        response.setVerifiedAt(report.getVerifiedAt());
        response.setVerifiedById(report.getVerifiedBy() != null ? report.getVerifiedBy().getId() : null);
        response.setVerificationNotes(report.getVerificationNotes());

        // Followup
        response.setRequiresFollowup(report.getRequiresFollowup());
        response.setFollowupDate(report.getFollowupDate());

        // Related
        response.setDuplicateOfId(report.getDuplicateOf() != null ? report.getDuplicateOf().getId() : null);
        response.setRelatedAlertId(report.getRelatedAlertId());

        // Counts
        response.setViewCount(report.getViewCount());
        response.setUpvoteCount(report.getUpvoteCount());
        response.setCommentCount(report.getCommentCount());

        // Metadata
        response.setMetadata(report.getMetadata());

        // Media
        response.setMedia(toReportMediaResponseList(report.getMedia()));

        // Status history
        response.setStatusHistory(toReportStatusHistoryResponseList(report.getStatusHistory()));

        // Timestamps
        response.setCreatedAt(report.getCreatedAt());
        response.setUpdatedAt(report.getUpdatedAt());

        return response;
    }

    // ============== REPORT LIST RESPONSE (lightweight) ==============

    public ReportListResponse toReportListResponse(Report report) {
        if (report == null) return null;

        ReportListResponse response = new ReportListResponse();
        response.setId(report.getId());
        response.setUuid(report.getUuid());
        response.setReportNumber(report.getReportNumber());

        // Reporter
        if (report.getUser() != null) {
            response.setUserId(report.getUser().getId());
            response.setUserName(Boolean.TRUE.equals(report.getIsAnonymous()) ? "Anonymous" : report.getUser().getFullName());
        }
        response.setIsAnonymous(report.getIsAnonymous());

        // Report type
        if (report.getReportType() != null) {
            response.setReportTypeId(report.getReportType().getId());
            response.setReportTypeCode(report.getReportType().getCode());
            response.setReportTypeName(report.getReportType().getName());
            response.setReportTypeIcon(report.getReportType().getIcon());
            response.setReportTypeColor(report.getReportType().getColor());
        }

        response.setPriority(report.getPriority() != null ? report.getPriority().name() : null);
        response.setStatus(report.getStatus() != null ? report.getStatus().name() : null);

        // Dam
        if (report.getDam() != null) {
            response.setDamId(report.getDam().getId());
            response.setDamName(report.getDam().getName());
        }

        // Location
        response.setLatitude(report.getLatitude());
        response.setLongitude(report.getLongitude());
        response.setLocationDescription(report.getLocationDescription());

        // Content (truncate description for list)
        response.setTitle(report.getTitle());
        String desc = report.getDescription();
        response.setDescription(desc != null && desc.length() > 200 ? desc.substring(0, 200) + "..." : desc);

        // Counts
        response.setViewCount(report.getViewCount());
        response.setUpvoteCount(report.getUpvoteCount());
        response.setCommentCount(report.getCommentCount());
        response.setMediaCount(report.getMedia() != null ? report.getMedia().size() : 0);

        // Assignment
        if (report.getAssignedTo() != null) {
            response.setAssignedToId(report.getAssignedTo().getId());
            response.setAssignedToName(report.getAssignedTo().getFullName());
        }

        // Timestamps
        response.setCreatedAt(report.getCreatedAt());
        response.setUpdatedAt(report.getUpdatedAt());

        return response;
    }

    // ============== ENTITY CREATION ==============

    public Report toReportEntity(CreateReportRequest request, User user, ReportType reportType,
                                  Dam dam, Region region, String uuid, String reportNumber) {
        if (request == null) return null;

        Report report = new Report();
        report.setUuid(uuid);
        report.setReportNumber(reportNumber);
        report.setUser(user);
        report.setReportType(reportType);
        report.setDam(dam);
        report.setRegion(region);

        report.setIsAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false);
        report.setLatitude(request.getLatitude());
        report.setLongitude(request.getLongitude());
        report.setLocationDescription(request.getLocationDescription());
        report.setLocationDescriptionSi(request.getLocationDescriptionSi());
        report.setTitle(request.getTitle());
        report.setDescription(request.getDescription());
        report.setDescriptionSi(request.getDescriptionSi());
        report.setMetadata(request.getMetadata());

        // Set priority from request or default from report type
        if (request.getPriority() != null) {
            report.setPriority(ReportType.Priority.valueOf(request.getPriority()));
        } else if (reportType.getDefaultPriority() != null) {
            report.setPriority(reportType.getDefaultPriority());
        }

        report.setStatus(Report.ReportStatus.pending);
        return report;
    }

    public ReportMedia toReportMediaEntity(MediaItemRequest request, Report report, User uploadedBy) {
        if (request == null) return null;

        ReportMedia media = new ReportMedia();
        media.setReport(report);
        media.setUploadedBy(uploadedBy);
        media.setFileName(request.getFileName());
        media.setFilePath(request.getFilePath());
        media.setFileUrl(request.getFileUrl());
        media.setFileType(ReportMedia.FileType.valueOf(request.getFileType()));
        media.setMimeType(request.getMimeType());
        media.setFileSizeBytes(request.getFileSizeBytes());
        media.setWidth(request.getWidth());
        media.setHeight(request.getHeight());
        media.setDurationSeconds(request.getDurationSeconds());
        media.setThumbnailUrl(request.getThumbnailUrl());
        media.setLatitude(request.getLatitude());
        media.setLongitude(request.getLongitude());
        media.setCapturedAt(request.getCapturedAt());
        media.setCaption(request.getCaption());
        media.setIsPrimary(request.getIsPrimary() != null ? request.getIsPrimary() : false);
        media.setDisplayOrder(0);
        return media;
    }
}
