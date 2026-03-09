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
public class DeviceApiKeyResponse {
    private Long id;
    private String keyPrefix;
    private Long sensorId;
    private String sensorUid;
    private String sensorName;
    private Long damId;
    private String damName;
    private String name;
    private String description;
    private Boolean isActive;
    private LocalDateTime lastUsedAt;
    private LocalDateTime expiresAt;
    private String createdByEmail;
    private LocalDateTime createdAt;
}
