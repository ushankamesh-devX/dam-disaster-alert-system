package com.ddas.api.dto.response.report;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ReportResponse {
    private Long id;
    private String uuid;
    private String reportNumber;

    // Reporter info
    private Long userId;
    private String userName;
    private Boolean isAnonymous;

    // Report type info
    private Long reportTypeId;
    private String reportTypeCode;
    private String reportTypeName;
    private String reportTypeIcon;
    private String reportTypeColor;

    // Priority
    private String priority;

    // Dam info
    private Long damId;
    private String damName;

    // Region info
    private Long regionId;
    private String regionName;

    // Location
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String locationDescription;
    private String locationDescriptionSi;

    // Content
    private String title;
    private String description;
    private String descriptionSi;

    // Status
    private String status;

    // Assignment
    private Long assignedToId;
    private String assignedToName;
    private LocalDateTime assignedAt;
    private Long assignedById;

    // Resolution
    private String resolutionNotes;
    private String resolutionNotesSi;
    private LocalDateTime resolvedAt;
    private Long resolvedById;
    private String rejectionReason;

    // Verification
    private Boolean isVerified;
    private LocalDateTime verifiedAt;
    private Long verifiedById;
    private String verificationNotes;

    // Followup
    private Boolean requiresFollowup;
    private LocalDate followupDate;

    // Related
    private Long duplicateOfId;
    private Long relatedAlertId;

    // Counts
    private Integer viewCount;
    private Integer upvoteCount;
    private Integer commentCount;

    // Metadata
    private String metadata;

    // Media
    private List<ReportMediaResponse> media;

    // Status history
    private List<ReportStatusHistoryResponse> statusHistory;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
