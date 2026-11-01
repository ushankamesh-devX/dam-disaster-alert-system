package com.ddas.api.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportListResponse {

    private Long id;
    private String reportNumber;
    private String title;
    private Boolean isAnonymous;
    private Long userId;
    private String userName;
    private Long damId;
    private String damName;
    private Long reportTypeId;
    private String reportTypeCode;
    private String reportTypeName;
    private String priority;
    private String status;
    private Long assignedToUserId;
    private String assignedToName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

