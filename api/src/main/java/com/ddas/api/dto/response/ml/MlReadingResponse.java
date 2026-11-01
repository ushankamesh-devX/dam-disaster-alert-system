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
public class MlReadingResponse {
    private Long id;
    private Long sensorId;
    private String sensorUid;
    private String sensorType;
    private BigDecimal readingValue;
    private String unit;
    private String quality;
    private String recordedAt;
    private String receivedAt;
}

