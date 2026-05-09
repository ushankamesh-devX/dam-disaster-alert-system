package com.ddas.api.dto.response.report;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ReportStatusHistoryResponse {
    private Long id;
    private String previousStatus;
    private String newStatus;
    private String notes;
    private Long changedById;
    private String changedByName;
    private LocalDateTime createdAt;
}
