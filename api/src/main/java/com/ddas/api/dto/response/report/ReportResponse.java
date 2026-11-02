package com.ddas.api.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {

    private Long id;
    private String uuid;
    private String reportNumber;
    private String title;
    private String description;
    private Boolean isAnonymous;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private Long damId;
    private String damName;
    private Long reportTypeId;
    private String reportTypeCode;
    private String reportTypeName;
    private String priority;
    private String status;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String locationDescription;
    private Long assignedToUserId;
    private String assignedToName;
    private LocalDateTime assignedAt;
    private String resolutionNotes;
    private LocalDateTime resolvedAt;
    private String rejectionReason;
    @Builder.Default
    private List<ReportMediaResponse> media = new ArrayList<>();
    @Builder.Default
    private List<String> mediaUrls = new ArrayList<>();
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
