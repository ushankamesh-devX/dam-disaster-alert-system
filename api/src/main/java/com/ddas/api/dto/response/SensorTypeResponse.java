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
public class SensorTypeResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String unit;
    private BigDecimal minThreshold;
    private BigDecimal maxThreshold;
    private BigDecimal criticalThreshold;
    private String icon;
    private LocalDateTime createdAt;
}
