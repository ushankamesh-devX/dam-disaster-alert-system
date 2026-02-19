package com.ddas.api.dto.response;

import com.ddas.api.entity.SensorReading;
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
public class SensorReadingResponse {
    private Long id;
    private Long sensorId;
    private String sensorName;
    private Long damId;
    private BigDecimal readingValue;
    private String unit;
    private SensorReading.ReadingQuality quality;
    private LocalDateTime recordedAt;
    private LocalDateTime receivedAt;
}
