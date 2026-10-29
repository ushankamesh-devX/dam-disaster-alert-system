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
public class MlWeatherDataResponse {
    private Long id;
    private Long damId;
    private String provider;
    private String dataType;
    private BigDecimal precipitationMm;
    private BigDecimal temperatureC;
    private BigDecimal relativeHumidityPct;
    private BigDecimal windSpeedMs;
    private BigDecimal forecastRainfall1hMm;
    private BigDecimal forecastRainfall3hMm;
    private BigDecimal forecastRainfall6hMm;
    private String validTime;
    private String fetchTime;
    private String issueTime;
}

