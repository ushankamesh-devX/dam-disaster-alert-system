package com.ddas.api.service;

import com.ddas.api.entity.Dam;
import com.ddas.api.entity.DamWeatherData;
import com.ddas.api.repository.DamRepository;
import com.ddas.api.repository.DamWeatherDataRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DamWeatherServiceTest {

    @Mock
    private DamRepository damRepository;

    @Mock
    private DamWeatherDataRepository damWeatherDataRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private DamWeatherService service;

    private Dam sampleDam;

    @BeforeEach
    void setUp() {
        sampleDam = Dam.builder()
                .id(1L)
                .code("DAM-VIC-001")
                .name("Victoria Dam")
                .latitude(new BigDecimal("7.2345"))
                .longitude(new BigDecimal("80.7891"))
                .build();
    }

    @Test
    void parseAndSaveOpenMeteoResponseParsesJsonAndComputesForecastSums() {
        String json = """
        {
          "hourly": {
            "time": ["2026-10-24T12:00", "2026-10-24T13:00", "2026-10-24T14:00"],
            "temperature_2m": [28.5, 29.0, 27.8],
            "relative_humidity_2m": [75.0, 72.0, 80.0],
            "precipitation": [2.5, 5.0, 1.5],
            "wind_speed_10m": [12.0, 14.5, 11.2]
          }
        }
        """;

        when(damWeatherDataRepository.saveAll(any()))
                .thenAnswer(inv -> inv.getArgument(0));

        List<DamWeatherData> saved = service.parseAndSaveOpenMeteoResponse(sampleDam, json);

        assertThat(saved).hasSize(3);
        DamWeatherData first = saved.get(0);
        assertThat(first.getDam()).isEqualTo(sampleDam);
        assertThat(first.getProvider()).isEqualTo("open-meteo");
        assertThat(first.getTemperatureC()).isEqualTo(new BigDecimal("28.50"));
        assertThat(first.getPrecipitationMm()).isEqualTo(new BigDecimal("2.50"));
        // 3-hour forward rainfall sum = 2.5 + 5.0 + 1.5 = 9.00
        assertThat(first.getForecastRainfall3hMm()).isEqualTo(new BigDecimal("9.00"));

        verify(damWeatherDataRepository).saveAll(any());
    }

    @Test
    void getWeatherForExportDelegatesToRepository() {
        when(damRepository.existsById(1L)).thenReturn(true);
        LocalDateTime from = LocalDateTime.of(2026, 10, 1, 0, 0);
        LocalDateTime to = LocalDateTime.of(2026, 10, 2, 0, 0);

        DamWeatherData weather = DamWeatherData.builder()
                .id(101L)
                .dam(sampleDam)
                .validTime(from)
                .precipitationMm(new BigDecimal("1.20"))
                .build();

        when(damWeatherDataRepository.findWeatherForExport(eq(1L), eq(from), eq(to), any(), any(), any(Pageable.class)))
                .thenReturn(List.of(weather));

        List<DamWeatherData> result = service.getWeatherForExport(1L, from, to, null, null, Pageable.unpaged());

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(101L);
    }
}

