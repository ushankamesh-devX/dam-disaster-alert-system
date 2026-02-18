package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String uuid;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String avatarUrl;
    private String status;
    private String languagePreference;
    private Boolean notificationEnabled;
    private RoleResponse role;
    private BigDecimal lastKnownLatitude;
    private BigDecimal lastKnownLongitude;
    private LocalDateTime lastLocationUpdate;
    private LocalDateTime emailVerifiedAt;
    private LocalDateTime phoneVerifiedAt;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

