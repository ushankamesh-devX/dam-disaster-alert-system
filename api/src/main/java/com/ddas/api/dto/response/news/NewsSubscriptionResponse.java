package com.ddas.api.dto.response.news;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NewsSubscriptionResponse {
    private Long id;
    private Long userId;
    private Long categoryId;
    private String categoryName;
    private Long regionId;
    private String regionName;

    private String minPriority;
    private Boolean pushEnabled;
    private Boolean emailEnabled;
    private Boolean smsEnabled;
    private Boolean isActive;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
