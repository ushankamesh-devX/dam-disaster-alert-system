package com.ddas.api.dto.response.ml;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MlOverflowConfigResponse {
    private Long damId;
    private BigDecimal verifiedThresholdMeters;
    private BigDecimal dangerLevelMeters;
    private BigDecimal fullReservoirLevelMeters;
    private String status;
    private Integer version;
    private String effectiveFrom;
}

