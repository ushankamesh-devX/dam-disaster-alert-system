package com.ddas.api.dto.request.news;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateNewsSubscriptionRequest {
    @NotNull(message = "User ID is required")
    private Long userId;

    private Long categoryId;
    private Long regionId;

    private String minPriority = "medium";
    private Boolean pushEnabled = true;
    private Boolean emailEnabled = false;
    private Boolean smsEnabled = false;
}
