package com.ddas.api.service;

import com.ddas.api.entity.Dam;
import com.ddas.api.entity.DamWeatherData;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.DamRepository;
import com.ddas.api.repository.DamWeatherDataRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DamWeatherService {

    private final DamRepository damRepository;
    private final DamWeatherDataRepository damWeatherDataRepository;
    private final ObjectMapper objectMapper;

    private static final String OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

    @Transactional
    public List<DamWeatherData> fetchAndStoreCatchmentWeather(Long damId) {
        Dam dam = damRepository.findById(damId)
                .orElseThrow(() -> new ResourceNotFoundException("Dam not found with id: " + damId));

        if (dam.getLatitude() == null || dam.getLongitude() == null) {
            log.warn("Dam {} missing coordinates; skipping weather fetch", damId);
            return List.of();
        }

        String uri = String.format(
                "%s?latitude=%s&longitude=%s&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&forecast_days=3",
                OPEN_METEO_URL, dam.getLatitude(), dam.getLongitude()
        );

        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(uri))
                    .timeout(Duration.ofSeconds(15))
                    .header("User-Agent", "DDAS-Weather-Collector/1.0")
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Open-Meteo returned status {}: {}", response.statusCode(), response.body());
                return List.of();
            }

            return parseAndSaveOpenMeteoResponse(dam, response.body());
        } catch (Exception e) {
            log.error("Failed to fetch weather from Open-Meteo for dam {}: {}", damId, e.getMessage());
            return List.of();
        }
    }

    @Transactional
    public List<DamWeatherData> parseAndSaveOpenMeteoResponse(Dam dam, String json) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode hourly = root.path("hourly");
            JsonNode times = hourly.path("time");
            JsonNode temps = hourly.path("temperature_2m");
            JsonNode humidities = hourly.path("relative_humidity_2m");
            JsonNode precipitations = hourly.path("precipitation");
            JsonNode winds = hourly.path("wind_speed_10m");

            if (!times.isArray() || times.isEmpty()) {
                return List.of();
            }

            LocalDateTime fetchTime = LocalDateTime.now(ZoneOffset.UTC);
            List<DamWeatherData> records = new ArrayList<>();

            for (int i = 0; i < times.size(); i++) {
                String timeStr = times.get(i).asText();
                LocalDateTime validTime = LocalDateTime.parse(timeStr);

                BigDecimal temp = temps.has(i) && !temps.get(i).isNull()
                        ? BigDecimal.valueOf(temps.get(i).asDouble()).setScale(2, RoundingMode.HALF_UP)
                        : null;
                BigDecimal hum = humidities.has(i) && !humidities.get(i).isNull()
                        ? BigDecimal.valueOf(humidities.get(i).asDouble()).setScale(2, RoundingMode.HALF_UP)
                        : null;
                BigDecimal precip = precipitations.has(i) && !precipitations.get(i).isNull()
                        ? BigDecimal.valueOf(precipitations.get(i).asDouble()).setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;
                BigDecimal wind = winds.has(i) && !winds.get(i).isNull()
                        ? BigDecimal.valueOf(winds.get(i).asDouble()).setScale(2, RoundingMode.HALF_UP)
                        : null;

                // 1h, 3h, 6h forward forecast totals
                BigDecimal f1h = precip;
                BigDecimal f3h = calculateForwardSum(precipitations, i, 3);
                BigDecimal f6h = calculateForwardSum(precipitations, i, 6);

                DamWeatherData.WeatherDataType type = validTime.isAfter(fetchTime)
                        ? DamWeatherData.WeatherDataType.forecast
                        : DamWeatherData.WeatherDataType.observation;

                DamWeatherData record = DamWeatherData.builder()
                        .dam(dam)
                        .provider("open-meteo")
                        .dataType(type)
                        .precipitationMm(precip)
                        .temperatureC(temp)
                        .relativeHumidityPct(hum)
                        .windSpeedMs(wind)
                        .forecastRainfall1hMm(f1h)
                        .forecastRainfall3hMm(f3h)
                        .forecastRainfall6hMm(f6h)
                        .validTime(validTime)
                        .fetchTime(fetchTime)
                        .issueTime(fetchTime)
                        .build();

                records.add(record);
            }

            return damWeatherDataRepository.saveAll(records);
        } catch (Exception e) {
            log.error("Failed to parse Open-Meteo response: {}", e.getMessage(), e);
            return List.of();
        }
    }

    public List<DamWeatherData> getWeatherForExport(
            Long damId,
            LocalDateTime from,
            LocalDateTime to,
            LocalDateTime asOf,
            Long cursorId,
            Pageable pageable
    ) {
        if (!damRepository.existsById(damId)) {
            throw new ResourceNotFoundException("Dam not found with id: " + damId);
        }
        return damWeatherDataRepository.findWeatherForExport(damId, from, to, asOf, cursorId, pageable);
    }

    private BigDecimal calculateForwardSum(JsonNode array, int startIndex, int hours) {
        double sum = 0.0;
        int end = Math.min(startIndex + hours, array.size());
        for (int j = startIndex; j < end; j++) {
            if (array.has(j) && !array.get(j).isNull()) {
                sum += array.get(j).asDouble();
            }
        }
        return BigDecimal.valueOf(sum).setScale(2, RoundingMode.HALF_UP);
    }
}

