package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response returned only once when a device API key is created.
 * Contains the raw API key — never stored or returned again.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceApiKeyCreatedResponse {
    private Long id;
    private String apiKey;          // The raw key — shown only once!
    private String keyPrefix;
    private Long sensorId;
    private String sensorUid;
    private String sensorName;
    private String name;
    private Boolean isActive;
    private LocalDateTime expiresAt;
    private LocalDateTime createdAt;
}
