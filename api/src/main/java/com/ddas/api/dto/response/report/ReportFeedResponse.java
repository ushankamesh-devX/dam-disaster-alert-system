package com.ddas.api.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportFeedResponse {

    private Long id;
    private String damName;
    private String issueType;
    private String issueTypeName;
    private String title;
    private String description;
    @Builder.Default
    private List<String> mediaUrls = new ArrayList<>();
    private String status;
    private LocalDateTime createdAt;
    private String reporterDisplayName;
    private Boolean isMine;
}

