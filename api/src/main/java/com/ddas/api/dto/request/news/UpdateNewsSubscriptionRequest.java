package com.ddas.api.dto.request.news;

import lombok.Data;

@Data
public class UpdateNewsSubscriptionRequest {
    private Boolean pushEnabled;
    private Boolean emailEnabled;
    private Boolean smsEnabled;
    private Boolean isActive;
    private String minPriority;
}
