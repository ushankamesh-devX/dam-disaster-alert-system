package com.ddas.api.service;

import com.ddas.api.dto.response.ml.*;
import com.ddas.api.entity.*;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.DamCurrentStatusRepository;
import com.ddas.api.repository.DamRepository;
import com.ddas.api.repository.SensorReadingRepository;
import com.ddas.api.repository.SensorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MlInternalDataService {

    private final DamRepository damRepository;
    private final SensorRepository sensorRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final DamCurrentStatusRepository damCurrentStatusRepository;
    private final DamOverflowConfigService damOverflowConfigService;
    private final DamStatusHistoryService damStatusHistoryService;
    private final DamWeatherService damWeatherService;
    private final DamForecastService damForecastService;

    public MlDataListResponse<MlDamMetadataResponse> getMlDams() {
        List<Dam> dams = damRepository.findAllWithRegion();
        List<MlDamMetadataResponse> dtoList = dams.stream()
                .map(this::mapDamToMetadata)
                .toList();
        return new MlDataListResponse<>(dtoList);
    }

    public MlDataListResponse<MlSensorResponse> getDamSensors(Long damId) {
        verifyDamExists(damId);
        List<Sensor> sensors = sensorRepository.findByDamIdWithSensorType(damId);
        List<MlSensorResponse> dtoList = sensors.stream()
                .map(this::mapSensorToResponse)
                .toList();
        return new MlDataListResponse<>(dtoList);
    }

    public MlCursorPageResponse<MlReadingResponse> getDamReadings(
            Long damId,
            String fromStr,
            String toStr,
            String cursor,
            Integer limit
    ) {
        verifyDamExists(damId);

        if (fromStr == null || fromStr.isBlank() || toStr == null || toStr.isBlank()) {
            throw new BadRequestException("Reading export requires both 'from' and 'to' timestamp bounds.");
        }

        OffsetDateTime fromOffset;
        OffsetDateTime toOffset;
        try {
            fromOffset = OffsetDateTime.parse(fromStr.trim());
            toOffset = OffsetDateTime.parse(toStr.trim());
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Reading time bounds must be valid ISO-8601 strings with timezone offset: " + e.getMessage());
        }

        if (fromOffset.isAfter(toOffset)) {
            throw new BadRequestException("Reading start ('from') must not be after end ('to').");
        }

        LocalDateTime fromUtc = fromOffset.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime toUtc = toOffset.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();

        Long cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            try {
                cursorId = Long.parseLong(cursor.trim());
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid cursor format; expected numeric reading id.");
            }
        }

        int queryLimit = (limit != null && limit > 0) ? Math.min(limit, 5000) : 1000;
        PageRequest pageRequest = PageRequest.of(0, queryLimit + 1);

        List<SensorReading> readings = sensorReadingRepository.findReadingsForExport(
                damId, fromUtc, toUtc, cursorId, pageRequest
        );

        boolean hasMore = readings.size() > queryLimit;
        List<SensorReading> pageItems = hasMore ? readings.subList(0, queryLimit) : readings;
        String nextCursor = (hasMore && !pageItems.isEmpty())
                ? String.valueOf(pageItems.get(pageItems.size() - 1).getId())
                : null;

        List<MlReadingResponse> dtoList = pageItems.stream()
                .map(this::mapReadingToResponse)
                .toList();

        return new MlCursorPageResponse<>(dtoList, nextCursor);
    }

    public MlDataResponse<MlStatusResponse> getDamStatus(Long damId) {
        verifyDamExists(damId);
        DamCurrentStatus status = damCurrentStatusRepository.findByDamId(damId)
                .orElseThrow(() -> new ResourceNotFoundException("Status not found for dam: " + damId));
        return new MlDataResponse<>(mapStatusToResponse(status));
    }

    public MlDataResponse<MlOverflowConfigResponse> getDamOverflowConfig(Long damId) {
        verifyDamExists(damId);
        return new MlDataResponse<>(damOverflowConfigService.getActiveConfig(damId));
    }

    public MlCursorPageResponse<MlStatusResponse> getDamStatusHistory(
            Long damId, String fromStr, String toStr, String cursor, Integer limit
    ) {
        verifyDamExists(damId);

        if (fromStr == null || fromStr.isBlank() || toStr == null || toStr.isBlank()) {
            return new MlCursorPageResponse<>(Collections.emptyList(), null);
        }

        OffsetDateTime fromOffset;
        OffsetDateTime toOffset;
        try {
            fromOffset = OffsetDateTime.parse(fromStr.trim());
            toOffset = OffsetDateTime.parse(toStr.trim());
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Status history time bounds must be valid ISO-8601 strings with timezone offset: " + e.getMessage());
        }

        if (fromOffset.isAfter(toOffset)) {
            throw new BadRequestException("Status history start ('from') must not be after end ('to').");
        }

        LocalDateTime fromUtc = fromOffset.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime toUtc = toOffset.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();

        Long cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            try {
                cursorId = Long.parseLong(cursor.trim());
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid cursor format; expected numeric snapshot id.");
            }
        }

        int queryLimit = (limit != null && limit > 0) ? Math.min(limit, 5000) : 1000;
        PageRequest pageRequest = PageRequest.of(0, queryLimit + 1);

        List<DamStatusHistory> history = damStatusHistoryService.getHistoryForExport(
                damId, fromUtc, toUtc, cursorId, pageRequest
        );

        boolean hasMore = history.size() > queryLimit;
        List<DamStatusHistory> pageItems = hasMore ? history.subList(0, queryLimit) : history;
        String nextCursor = (hasMore && !pageItems.isEmpty())
                ? String.valueOf(pageItems.get(pageItems.size() - 1).getId())
                : null;

        List<MlStatusResponse> dtoList = pageItems.stream()
                .map(this::mapHistoryToResponse)
                .toList();

        return new MlCursorPageResponse<>(dtoList, nextCursor);
    }

    public MlCursorPageResponse<MlForecastResponse> getDamForecasts(
            Long damId, String fromStr, String toStr, String cursor, Integer limit
    ) {
        verifyDamExists(damId);

        LocalDateTime fromUtc = null;
        LocalDateTime toUtc = null;
        if (fromStr != null && !fromStr.isBlank()) {
            try {
                fromUtc = OffsetDateTime.parse(fromStr.trim()).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
            } catch (DateTimeParseException e) {
                throw new BadRequestException("Forecast start ('from') must be valid ISO-8601 with offset.");
            }
        }
        if (toStr != null && !toStr.isBlank()) {
            try {
                toUtc = OffsetDateTime.parse(toStr.trim()).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
            } catch (DateTimeParseException e) {
                throw new BadRequestException("Forecast end ('to') must be valid ISO-8601 with offset.");
            }
        }
        if (fromUtc != null && toUtc != null && fromUtc.isAfter(toUtc)) {
            throw new BadRequestException("Forecast start ('from') must not be after end ('to').");
        }

        Long cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            try {
                cursorId = Long.parseLong(cursor.trim());
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid cursor format; expected numeric forecast id.");
            }
        }

        int queryLimit = (limit != null && limit > 0) ? Math.min(limit, 5000) : 1000;
        PageRequest pageRequest = PageRequest.of(0, queryLimit + 1);

        List<DamForecast> forecasts = damForecastService.getForecastsForExport(
                damId, fromUtc, toUtc, cursorId, pageRequest
        );

        boolean hasMore = forecasts.size() > queryLimit;
        List<DamForecast> pageItems = hasMore ? forecasts.subList(0, queryLimit) : forecasts;
        String nextCursor = (hasMore && !pageItems.isEmpty())
                ? String.valueOf(pageItems.get(pageItems.size() - 1).getId())
                : null;

        List<MlForecastResponse> dtoList = pageItems.stream()
                .map(this::mapForecastToResponse)
                .toList();

        return new MlCursorPageResponse<>(dtoList, nextCursor);
    }

    public MlCursorPageResponse<MlWeatherDataResponse> getDamWeather(
            Long damId, String fromStr, String toStr, String asOfStr, String cursor, Integer limit
    ) {
        verifyDamExists(damId);

        if (fromStr == null || fromStr.isBlank() || toStr == null || toStr.isBlank()) {
            return new MlCursorPageResponse<>(Collections.emptyList(), null);
        }

        OffsetDateTime fromOffset;
        OffsetDateTime toOffset;
        OffsetDateTime asOfOffset = null;
        try {
            fromOffset = OffsetDateTime.parse(fromStr.trim());
            toOffset = OffsetDateTime.parse(toStr.trim());
            if (asOfStr != null && !asOfStr.isBlank()) {
                asOfOffset = OffsetDateTime.parse(asOfStr.trim());
            }
        } catch (DateTimeParseException e) {
            throw new BadRequestException("Weather time bounds must be valid ISO-8601 strings with timezone offset: " + e.getMessage());
        }

        if (fromOffset.isAfter(toOffset)) {
            throw new BadRequestException("Weather start ('from') must not be after end ('to').");
        }

        LocalDateTime fromUtc = fromOffset.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime toUtc = toOffset.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
        LocalDateTime asOfUtc = asOfOffset != null ? asOfOffset.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime() : null;

        Long cursorId = null;
        if (cursor != null && !cursor.isBlank()) {
            try {
                cursorId = Long.parseLong(cursor.trim());
            } catch (NumberFormatException e) {
                throw new BadRequestException("Invalid cursor format; expected numeric weather record id.");
            }
        }

        int queryLimit = (limit != null && limit > 0) ? Math.min(limit, 5000) : 1000;
        PageRequest pageRequest = PageRequest.of(0, queryLimit + 1);

        List<DamWeatherData> weatherRecords = damWeatherService.getWeatherForExport(
                damId, fromUtc, toUtc, asOfUtc, cursorId, pageRequest
        );

        boolean hasMore = weatherRecords.size() > queryLimit;
        List<DamWeatherData> pageItems = hasMore ? weatherRecords.subList(0, queryLimit) : weatherRecords;
        String nextCursor = (hasMore && !pageItems.isEmpty())
                ? String.valueOf(pageItems.get(pageItems.size() - 1).getId())
                : null;

        List<MlWeatherDataResponse> dtoList = pageItems.stream()
                .map(this::mapWeatherToResponse)
                .toList();

        return new MlCursorPageResponse<>(dtoList, nextCursor);
    }

    private void verifyDamExists(Long damId) {
        if (!damRepository.existsById(damId)) {
            throw new ResourceNotFoundException("Dam not found with id: " + damId);
        }
    }

    private MlForecastResponse mapForecastToResponse(DamForecast f) {
        return MlForecastResponse.builder()
                .id(f.getId())
                .damId(f.getDam().getId())
                .issuedAt(f.getIssuedAt())
                .asOf(f.getAsOf())
                .latestReadingAt(f.getLatestReadingAt())
                .freshness(f.getFreshness())
                .demoMode(f.getDemoMode())
                .releaseId(f.getReleaseId())
                .overflowThresholdMeters(f.getOverflowThresholdMeters())
                .overflowConfigVersion(f.getOverflowConfigVersion())
                .horizonHours(f.getHorizonHours())
                .targetTime(f.getTargetTime())
                .levelP10(f.getLevelP10())
                .levelP50(f.getLevelP50())
                .levelP90(f.getLevelP90())
                .overflowProbability(f.getOverflowProbability())
                .overflowProbabilityReason(f.getOverflowProbabilityReason())
                .isPublished(f.getIsPublished())
                .createdAt(f.getCreatedAt())
                .build();
    }

    private MlDamMetadataResponse mapDamToMetadata(Dam dam) {
        return MlDamMetadataResponse.builder()
                .id(dam.getId())
                .code(dam.getCode())
                .name(dam.getName())
                .nameSi(dam.getNameSi())
                .nameTa(dam.getNameTa())
                .regionId(dam.getRegion() != null ? dam.getRegion().getId() : null)
                .regionName(dam.getRegion() != null ? dam.getRegion().getName() : null)
                .latitude(dam.getLatitude())
                .longitude(dam.getLongitude())
                .damType(dam.getDamType() != null ? dam.getDamType().name() : null)
                .heightMeters(dam.getHeightMeters())
                .lengthMeters(dam.getLengthMeters())
                .reservoirCapacityMcm(dam.getReservoirCapacityMcm())
                .grossStorageMcm(dam.getGrossStorageMcm())
                .liveStorageMcm(dam.getLiveStorageMcm())
                .deadStorageMcm(dam.getDeadStorageMcm())
                .catchmentAreaSqkm(dam.getCatchmentAreaSqkm())
                .spillwayCapacityCumecs(dam.getSpillwayCapacityCumecs())
                .riverName(dam.getRiverName())
                .status(dam.getStatus() != null ? dam.getStatus().name() : null)
                .riskClassification(dam.getRiskClassification() != null ? dam.getRiskClassification().name() : null)
                .isMlEnabled(dam.getStatus() == Dam.DamStatus.operational)
                .build();
    }

    private MlSensorResponse mapSensorToResponse(Sensor sensor) {
        MlSensorTypeResponse typeDto = null;
        if (sensor.getSensorType() != null) {
            typeDto = MlSensorTypeResponse.builder()
                    .id(sensor.getSensorType().getId())
                    .code(sensor.getSensorType().getCode())
                    .name(sensor.getSensorType().getName())
                    .unit(sensor.getSensorType().getUnit())
                    .build();
        }

        String unit = sensor.getSensorType() != null ? sensor.getSensorType().getUnit() : null;

        String lastReadingAtStr = sensor.getLastReadingAt() != null
                ? sensor.getLastReadingAt().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;

        String role = sensor.getSensorRole() != null ? sensor.getSensorRole().name() : "general";
        java.math.BigDecimal referenceLevel = sensor.getReferenceLevelMeters() != null
                ? sensor.getReferenceLevelMeters()
                : sensor.getElevationMeters();

        return MlSensorResponse.builder()
                .id(sensor.getId())
                .sensorUid(sensor.getSensorUid())
                .damId(sensor.getDam() != null ? sensor.getDam().getId() : null)
                .name(sensor.getName())
                .description(sensor.getDescription())
                .sensorType(typeDto)
                .unit(unit)
                .sensorRole(role)
                .locationOnDam(sensor.getLocationOnDam())
                .elevationMeters(sensor.getElevationMeters())
                .referenceLevelMeters(referenceLevel)
                .isMlFeature(sensor.getIsMlFeature() != null ? sensor.getIsMlFeature() : true)
                .latitude(sensor.getLatitude())
                .longitude(sensor.getLongitude())
                .manufacturer(sensor.getManufacturer())
                .model(sensor.getModel())
                .serialNumber(sensor.getSerialNumber())
                .minReading(sensor.getMinReading())
                .maxReading(sensor.getMaxReading())
                .warningThreshold(sensor.getWarningThreshold())
                .criticalThreshold(sensor.getCriticalThreshold())
                .readingIntervalSeconds(sensor.getReadingIntervalSeconds())
                .status(sensor.getStatus() != null ? sensor.getStatus().name() : null)
                .lastReadingAt(lastReadingAtStr)
                .build();
    }

    private MlReadingResponse mapReadingToResponse(SensorReading reading) {
        String unit = reading.getUnit();
        if (unit == null && reading.getSensor() != null && reading.getSensor().getSensorType() != null) {
            unit = reading.getSensor().getSensorType().getUnit();
        }

        String recordedAtStr = reading.getRecordedAt() != null
                ? reading.getRecordedAt().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;

        String receivedAtStr = reading.getReceivedAt() != null
                ? reading.getReceivedAt().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;

        return MlReadingResponse.builder()
                .id(reading.getId())
                .sensorId(reading.getSensor() != null ? reading.getSensor().getId() : null)
                .sensorUid(reading.getSensor() != null ? reading.getSensor().getSensorUid() : null)
                .sensorType(reading.getSensor() != null && reading.getSensor().getSensorType() != null ? reading.getSensor().getSensorType().getCode() : null)
                .readingValue(reading.getReadingValue())
                .unit(unit)
                .quality(reading.getQuality() != null ? reading.getQuality().name() : "good")
                .recordedAt(recordedAtStr)
                .receivedAt(receivedAtStr)
                .build();
    }

    private MlStatusResponse mapStatusToResponse(DamCurrentStatus status) {
        String lastReadingAtStr = status.getLastSensorReadingAt() != null
                ? status.getLastSensorReadingAt().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;

        String lastHazardAssessmentAtStr = status.getLastHazardAssessmentAt() != null
                ? status.getLastHazardAssessmentAt().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;

        String lastUpdatedStr = status.getLastUpdated() != null
                ? status.getLastUpdated().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;

        return MlStatusResponse.builder()
                .id(status.getId())
                .damId(status.getDam() != null ? status.getDam().getId() : null)
                .waterLevelMeters(status.getWaterLevelMeters())
                .waterLevelPercentage(status.getWaterLevelPercentage())
                .fullReservoirLevelMeters(status.getFullReservoirLevelMeters())
                .dangerLevelMeters(status.getDangerLevelMeters())
                .inflowCumecs(status.getInflowCumecs())
                .outflowCumecs(status.getOutflowCumecs())
                .storageCurrentMcm(status.getStorageCurrentMcm())
                .storagePercentage(status.getStoragePercentage())
                .spillwayGateStatus(status.getSpillwayGateStatus())
                .gatesOpenCount(status.getGatesOpenCount())
                .totalGatesCount(status.getTotalGatesCount())
                .hazardStatus(status.getHazardStatus() != null ? status.getHazardStatus().name() : null)
                .hazardValue(status.getHazardValue())
                .floodRiskScore(status.getFloodRiskScore())
                .rainfallLast1hrMm(status.getRainfallLast1hrMm())
                .rainfallLast24hrMm(status.getRainfallLast24hrMm())
                .rainfallForecast24hrMm(status.getRainfallForecast24hrMm())
                .lastSensorReadingAt(lastReadingAtStr)
                .lastHazardAssessmentAt(lastHazardAssessmentAtStr)
                .lastUpdated(lastUpdatedStr)
                .build();
    }

    private MlWeatherDataResponse mapWeatherToResponse(DamWeatherData w) {
        String validTimeStr = w.getValidTime() != null
                ? w.getValidTime().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;
        String fetchTimeStr = w.getFetchTime() != null
                ? w.getFetchTime().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;
        String issueTimeStr = w.getIssueTime() != null
                ? w.getIssueTime().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;

        return MlWeatherDataResponse.builder()
                .id(w.getId())
                .damId(w.getDam() != null ? w.getDam().getId() : null)
                .provider(w.getProvider())
                .dataType(w.getDataType() != null ? w.getDataType().name() : null)
                .precipitationMm(w.getPrecipitationMm())
                .temperatureC(w.getTemperatureC())
                .relativeHumidityPct(w.getRelativeHumidityPct())
                .windSpeedMs(w.getWindSpeedMs())
                .forecastRainfall1hMm(w.getForecastRainfall1hMm())
                .forecastRainfall3hMm(w.getForecastRainfall3hMm())
                .forecastRainfall6hMm(w.getForecastRainfall6hMm())
                .validTime(validTimeStr)
                .fetchTime(fetchTimeStr)
                .issueTime(issueTimeStr)
                .build();
    }

    private MlStatusResponse mapHistoryToResponse(DamStatusHistory history) {
        String recordedAtStr = history.getRecordedAt() != null
                ? history.getRecordedAt().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                : null;

        return MlStatusResponse.builder()
                .id(history.getId())
                .damId(history.getDam() != null ? history.getDam().getId() : null)
                .waterLevelMeters(history.getWaterLevelMeters())
                .waterLevelPercentage(history.getWaterLevelPercentage())
                .fullReservoirLevelMeters(history.getFullReservoirLevelMeters())
                .dangerLevelMeters(history.getDangerLevelMeters())
                .inflowCumecs(history.getInflowCumecs())
                .outflowCumecs(history.getOutflowCumecs())
                .storageCurrentMcm(history.getStorageCurrentMcm())
                .storagePercentage(history.getStoragePercentage())
                .spillwayGateStatus(history.getSpillwayGateStatus())
                .gatesOpenCount(history.getGatesOpenCount())
                .totalGatesCount(history.getTotalGatesCount())
                .hazardStatus(history.getHazardStatus() != null ? history.getHazardStatus().name() : null)
                .hazardValue(history.getHazardValue())
                .floodRiskScore(history.getFloodRiskScore())
                .rainfallLast1hrMm(history.getRainfallLast1hrMm())
                .rainfallLast24hrMm(history.getRainfallLast24hrMm())
                .rainfallForecast24hrMm(history.getRainfallForecast24hrMm())
                .lastSensorReadingAt(recordedAtStr)
                .lastHazardAssessmentAt(null)
                .lastUpdated(recordedAtStr)
                .build();
    }
}
