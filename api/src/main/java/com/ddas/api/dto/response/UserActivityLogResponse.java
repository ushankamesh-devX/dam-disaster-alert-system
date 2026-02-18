package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserActivityLogResponse {
    private Long id;
    private Long userId;
    private String userEmail;
    private String userFullName;
    private String activityType;
    private String description;
    private String ipAddress;
    private String deviceInfo;
    private LocalDateTime createdAt;
}
