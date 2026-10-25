package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dam_weather_data")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamWeatherData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id", nullable = false)
    private Dam dam;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String provider = "open-meteo";

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 30)
    @Builder.Default
    private WeatherDataType dataType = WeatherDataType.observation;

    @Column(name = "precipitation_mm", precision = 8, scale = 2)
    private BigDecimal precipitationMm;

    @Column(name = "temperature_c", precision = 5, scale = 2)
    private BigDecimal temperatureC;

    @Column(name = "relative_humidity_pct", precision = 5, scale = 2)
    private BigDecimal relativeHumidityPct;

    @Column(name = "wind_speed_ms", precision = 5, scale = 2)
    private BigDecimal windSpeedMs;

    @Column(name = "forecast_rainfall_1h_mm", precision = 8, scale = 2)
    private BigDecimal forecastRainfall1hMm;

    @Column(name = "forecast_rainfall_3h_mm", precision = 8, scale = 2)
    private BigDecimal forecastRainfall3hMm;

    @Column(name = "forecast_rainfall_6h_mm", precision = 8, scale = 2)
    private BigDecimal forecastRainfall6hMm;

    @Column(name = "valid_time", nullable = false)
    private LocalDateTime validTime;

    @Column(name = "fetch_time", nullable = false)
    private LocalDateTime fetchTime;

    @Column(name = "issue_time")
    private LocalDateTime issueTime;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum WeatherDataType {
        observation, forecast, reanalysis
    }
}

