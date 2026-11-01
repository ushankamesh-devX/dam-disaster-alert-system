package com.ddas.api.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportStatsResponse {

    private long totalReports;
    private long pendingCount;
    private long reviewingCount;
    private long inProgressCount;
    private long resolvedCount;
    private long rejectedCount;
    private long duplicateCount;
}

