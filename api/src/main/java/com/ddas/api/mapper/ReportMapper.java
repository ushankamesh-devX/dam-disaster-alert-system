package com.ddas.api.mapper;

import com.ddas.api.dto.response.report.ReportListResponse;
import com.ddas.api.dto.response.report.ReportMediaResponse;
import com.ddas.api.dto.response.report.ReportResponse;
import com.ddas.api.dto.response.report.ReportTypeResponse;
import com.ddas.api.entity.Report;
import com.ddas.api.entity.ReportMedia;
import com.ddas.api.entity.ReportType;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class ReportMapper {

    public ReportTypeResponse toReportTypeResponse(ReportType type) {
        if (type == null) {
            return null;
        }
        return ReportTypeResponse.builder()
                .id(type.getId())
                .code(type.getCode())
                .name(type.getName())
                .nameSi(type.getNameSi())
                .nameTa(type.getNameTa())
                .description(type.getDescription())
                .icon(type.getIcon())
                .color(type.getColor())
                .category(type.getCategory() != null ? type.getCategory().name() : null)
                .defaultPriority(type.getDefaultPriority() != null ? type.getDefaultPriority().name() : null)
                .requiresPhoto(type.getRequiresPhoto())
                .requiresLocation(type.getRequiresLocation())
                .autoAlertThreshold(type.getAutoAlertThreshold())
                .isActive(type.getIsActive())
                .displayOrder(type.getDisplayOrder())
                .createdAt(type.getCreatedAt())
                .updatedAt(type.getUpdatedAt())
                .build();
    }

    public List<ReportTypeResponse> toReportTypeResponseList(List<ReportType> list) {
        if (list == null) {
            return Collections.emptyList();
        }
        return list.stream().map(this::toReportTypeResponse).collect(Collectors.toList());
    }

    public ReportMediaResponse toReportMediaResponse(ReportMedia media) {
        if (media == null) {
            return null;
        }
        return ReportMediaResponse.builder()
                .id(media.getId())
                .uuid(media.getUuid())
                .fileName(media.getFileName())
                .mediaUrl(media.getFileUrl())
                .mediaType(media.getFileType() != null ? media.getFileType().name() : null)
                .mimeType(media.getMimeType())
                .fileSizeBytes(media.getFileSizeBytes())
                .width(media.getWidth())
                .height(media.getHeight())
                .createdAt(media.getCreatedAt())
                .build();
    }

    public List<ReportMediaResponse> toReportMediaResponseList(List<ReportMedia> list) {
        if (list == null) {
            return Collections.emptyList();
        }
        return list.stream().map(this::toReportMediaResponse).collect(Collectors.toList());
    }

    public ReportListResponse toReportListResponse(Report report) {
        if (report == null) {
            return null;
        }

        String userName = "Unknown";
        Long userId = null;
        if (Boolean.TRUE.equals(report.getIsAnonymous())) {
            userName = "Anonymous";
            if (report.getUser() != null) {
                userId = report.getUser().getId();
            }
        } else if (report.getUser() != null) {
            userName = report.getUser().getFullName();
            userId = report.getUser().getId();
        }

        return ReportListResponse.builder()
                .id(report.getId())
                .reportNumber(report.getReportNumber())
                .title(report.getTitle())
                .isAnonymous(report.getIsAnonymous())
                .userId(userId)
                .userName(userName)
                .damId(report.getDam() != null ? report.getDam().getId() : null)
                .damName(report.getDam() != null ? report.getDam().getName() : null)
                .reportTypeId(report.getReportType() != null ? report.getReportType().getId() : null)
                .reportTypeCode(report.getReportType() != null ? report.getReportType().getCode() : null)
                .reportTypeName(report.getReportType() != null ? report.getReportType().getName() : null)
                .priority(report.getPriority() != null ? report.getPriority().name() : null)
                .status(report.getStatus() != null ? report.getStatus().name() : null)
                .assignedToUserId(report.getAssignedTo() != null ? report.getAssignedTo().getId() : null)
                .assignedToName(report.getAssignedTo() != null ? report.getAssignedTo().getFullName() : null)
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }

    public ReportResponse toReportResponse(Report report) {
        if (report == null) {
            return null;
        }

        String userName = "Unknown";
        Long userId = null;
        if (Boolean.TRUE.equals(report.getIsAnonymous())) {
            userName = "Anonymous";
            if (report.getUser() != null) {
                userId = report.getUser().getId();
            }
        } else if (report.getUser() != null) {
            userName = report.getUser().getFullName();
            userId = report.getUser().getId();
        }

        return ReportResponse.builder()
                .id(report.getId())
                .uuid(report.getUuid())
                .reportNumber(report.getReportNumber())
                .title(report.getTitle())
                .description(report.getDescription())
                .isAnonymous(report.getIsAnonymous())
                .userId(userId)
                .userName(userName)
                .damId(report.getDam() != null ? report.getDam().getId() : null)
                .damName(report.getDam() != null ? report.getDam().getName() : null)
                .reportTypeId(report.getReportType() != null ? report.getReportType().getId() : null)
                .reportTypeCode(report.getReportType() != null ? report.getReportType().getCode() : null)
                .reportTypeName(report.getReportType() != null ? report.getReportType().getName() : null)
                .priority(report.getPriority() != null ? report.getPriority().name() : null)
                .status(report.getStatus() != null ? report.getStatus().name() : null)
                .latitude(report.getLatitude())
                .longitude(report.getLongitude())
                .locationDescription(report.getLocationDescription())
                .assignedToUserId(report.getAssignedTo() != null ? report.getAssignedTo().getId() : null)
                .assignedToName(report.getAssignedTo() != null ? report.getAssignedTo().getFullName() : null)
                .assignedAt(report.getAssignedAt())
                .resolutionNotes(report.getResolutionNotes())
                .resolvedAt(report.getResolvedAt())
                .rejectionReason(report.getRejectionReason())
                .media(toReportMediaResponseList(report.getMediaList()))
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }
}

