package com.ddas.api.service;

import com.ddas.api.entity.Dam;
import com.ddas.api.entity.DamForecast;
import com.ddas.api.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MlLatestForecastTest {
    @Mock private DamForecastService forecasts;
    @InjectMocks private MlInternalDataService service;

    @Test void latestUsesPublishedRunAndPreservesForecastContract() {
        when(forecasts.getLatestForecasts(6L)).thenReturn(List.of(DamForecast.builder()
                .dam(Dam.builder().id(6L).build()).id(21L).horizonHours(3)
                .levelP10(BigDecimal.ZERO).levelP50(BigDecimal.ZERO).levelP90(BigDecimal.ONE)
                .overflowProbability(BigDecimal.ZERO).freshness("stale").demoMode(true)
                .isPublished(true).build()));
        var result = service.getLatestDamForecasts(6L).getData().get(0);
        assertEquals(6L, result.getDamId());
        assertEquals(BigDecimal.ZERO, result.getLevelP50());
        assertEquals(BigDecimal.ZERO, result.getOverflowProbability());
        assertEquals(BigDecimal.ONE, result.getLevelP90());
        assertEquals("stale", result.getFreshness());
        assertTrue(result.getDemoMode());
        assertTrue(result.getIsPublished());
        verify(forecasts).getLatestForecasts(6L);
    }
    @Test void noPublishedRunIsEmpty() {
        when(forecasts.getLatestForecasts(6L)).thenReturn(List.of());
        assertTrue(service.getLatestDamForecasts(6L).getData().isEmpty());
    }
    @Test void unavailableDamRemainsAnError() {
        when(forecasts.getLatestForecasts(99L)).thenThrow(new ResourceNotFoundException("Dam missing"));
        assertThrows(ResourceNotFoundException.class, () -> service.getLatestDamForecasts(99L));
    }
}
