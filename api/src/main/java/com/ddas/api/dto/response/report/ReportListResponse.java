package com.ddas.api.dto.response.report;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ReportListResponse {
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

    // Priority and status
    private String priority;
    private String status;

    // Dam info
    private Long damId;
    private String damName;

    // Location
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String locationDescription;

    // Content preview
    private String title;
    private String description; // truncated in mapper

    // Counts
    private Integer viewCount;
    private Integer upvoteCount;
    private Integer commentCount;
    private int mediaCount;

    // Assignment
    private Long assignedToId;
    private String assignedToName;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
