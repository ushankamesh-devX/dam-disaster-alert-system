package com.ddas.api.dto.response.report;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReportStatsResponse {
    private long totalReports;
    private long pendingCount;
    private long reviewingCount;
    private long inProgressCount;
    private long resolvedCount;
    private long rejectedCount;
    private long duplicateCount;
}
