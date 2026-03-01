package com.ddas.api.mapper;

import com.ddas.api.dto.request.*;
import com.ddas.api.dto.response.*;
import com.ddas.api.entity.*;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class DamMapper {
    
    // ============== REGION MAPPINGS ==============
    
    public RegionResponse toRegionResponse(Region region) {
        if (region == null) return null;
        
        return RegionResponse.builder()
                .id(region.getId())
                .name(region.getName())
                .nameSi(region.getNameSi())
                .nameTa(region.getNameTa())
                .stateProvince(region.getStateProvince())
                .country(region.getCountry())
                .latitude(region.getLatitude())
                .longitude(region.getLongitude())
                .boundaryGeojson(region.getBoundaryGeojson())
                .createdAt(region.getCreatedAt())
                .build();
    }
    
    public List<RegionResponse> toRegionResponseList(List<Region> regions) {
        return regions.stream()
                .map(this::toRegionResponse)
                .collect(Collectors.toList());
    }
    
    public Region toRegionEntity(CreateRegionRequest request) {
        return Region.builder()
                .name(request.getName())
                .nameSi(request.getNameSi())
                .nameTa(request.getNameTa())
                .stateProvince(request.getStateProvince())
                .country(request.getCountry())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .boundaryGeojson(request.getBoundaryGeojson())
                .build();
    }
    
    public void updateRegionFromRequest(Region region, UpdateRegionRequest request) {
        if (request.getName() != null) region.setName(request.getName());
        if (request.getNameSi() != null) region.setNameSi(request.getNameSi());
        if (request.getNameTa() != null) region.setNameTa(request.getNameTa());
        if (request.getStateProvince() != null) region.setStateProvince(request.getStateProvince());
        if (request.getCountry() != null) region.setCountry(request.getCountry());
        if (request.getLatitude() != null) region.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) region.setLongitude(request.getLongitude());
        if (request.getBoundaryGeojson() != null) region.setBoundaryGeojson(request.getBoundaryGeojson());
    }
    
    // ============== HAZARD LEVEL MAPPINGS ==============
    
    public HazardLevelResponse toHazardLevelResponse(HazardLevel hazardLevel) {
        if (hazardLevel == null) return null;
        
        return HazardLevelResponse.builder()
                .id(hazardLevel.getId())
                .levelNumber(hazardLevel.getLevelNumber())
                .code(hazardLevel.getCode())
                .name(hazardLevel.getName())
                .nameSi(hazardLevel.getNameSi())
                .description(hazardLevel.getDescription())
                .descriptionSi(hazardLevel.getDescriptionSi())
                .color(hazardLevel.getColor())
                .fillOpacity(hazardLevel.getFillOpacity())
                .strokeColor(hazardLevel.getStrokeColor())
                .strokeWidth(hazardLevel.getStrokeWidth())
                .icon(hazardLevel.getIcon())
                .riskScoreMin(hazardLevel.getRiskScoreMin())
                .riskScoreMax(hazardLevel.getRiskScoreMax())
                .evacuationRequired(hazardLevel.getEvacuationRequired())
                .notificationPriority(hazardLevel.getNotificationPriority())
                .estimatedFloodTimeMinutes(hazardLevel.getEstimatedFloodTimeMinutes())
                .isActive(hazardLevel.getIsActive())
                .displayOrder(hazardLevel.getDisplayOrder())
                .createdAt(hazardLevel.getCreatedAt())
                .build();
    }
    
    public List<HazardLevelResponse> toHazardLevelResponseList(List<HazardLevel> hazardLevels) {
        return hazardLevels.stream()
                .map(this::toHazardLevelResponse)
                .collect(Collectors.toList());
    }
    
    // ============== DAM MAPPINGS ==============
    
    public DamResponse toDamResponse(Dam dam) {
        if (dam == null) return null;
        
        return DamResponse.builder()
                .id(dam.getId())
                .code(dam.getCode())
                .name(dam.getName())
                .nameSi(dam.getNameSi())
                .nameTa(dam.getNameTa())
                .region(toRegionResponse(dam.getRegion()))
                .locationDescription(dam.getLocationDescription())
                .latitude(dam.getLatitude())
                .longitude(dam.getLongitude())
                .damType(dam.getDamType())
                .heightMeters(dam.getHeightMeters())
                .lengthMeters(dam.getLengthMeters())
                .reservoirCapacityMcm(dam.getReservoirCapacityMcm())
                .grossStorageMcm(dam.getGrossStorageMcm())
                .liveStorageMcm(dam.getLiveStorageMcm())
                .deadStorageMcm(dam.getDeadStorageMcm())
                .catchmentAreaSqkm(dam.getCatchmentAreaSqkm())
                .spillwayCapacityCumecs(dam.getSpillwayCapacityCumecs())
                .yearCompleted(dam.getYearCompleted() != null ? dam.getYearCompleted().getValue() : null)
                .riverName(dam.getRiverName())
                .purpose(dam.getPurpose())
                .operatorOrganization(dam.getOperatorOrganization())
                .contactPhone(dam.getContactPhone())
                .contactEmail(dam.getContactEmail())
                .emergencyPhone(dam.getEmergencyPhone())
                .overallHazardLevel(toHazardLevelResponse(dam.getOverallHazardLevel()))
                .overallHazardStatus(dam.getOverallHazardStatus())
                .hazardLastAssessedAt(dam.getHazardLastAssessedAt())
                .status(dam.getStatus())
                .riskClassification(dam.getRiskClassification())
                .lastInspectionDate(dam.getLastInspectionDate())
                .nextInspectionDate(dam.getNextInspectionDate())
                .imageUrl(dam.getImageUrl())
                .mapCenterLatitude(dam.getMapCenterLatitude())
                .mapCenterLongitude(dam.getMapCenterLongitude())
                .mapDefaultZoom(dam.getMapDefaultZoom())
                .createdAt(dam.getCreatedAt())
                .updatedAt(dam.getUpdatedAt())
                .build();
    }
    
    public DamListResponse toDamListResponse(Dam dam) {
        if (dam == null) return null;
        
        return DamListResponse.builder()
                .id(dam.getId())
                .code(dam.getCode())
                .name(dam.getName())
                .nameSi(dam.getNameSi())
                .regionName(dam.getRegion() != null ? dam.getRegion().getName() : null)
                .latitude(dam.getLatitude())
                .longitude(dam.getLongitude())
                .damType(dam.getDamType())
                .overallHazardStatus(dam.getOverallHazardStatus())
                .status(dam.getStatus())
                .riskClassification(dam.getRiskClassification())
                .imageUrl(dam.getImageUrl())
                .updatedAt(dam.getUpdatedAt())
                .build();
    }
    
    public List<DamResponse> toDamResponseList(List<Dam> dams) {
        return dams.stream()
                .map(this::toDamResponse)
                .collect(Collectors.toList());
    }
    
    public List<DamListResponse> toDamListResponseList(List<Dam> dams) {
        return dams.stream()
                .map(this::toDamListResponse)
                .collect(Collectors.toList());
    }
    
    public Dam toDamEntity(CreateDamRequest request, Region region, HazardLevel hazardLevel) {
        return Dam.builder()
                .code(request.getCode())
                .name(request.getName())
                .nameSi(request.getNameSi())
                .nameTa(request.getNameTa())
                .region(region)
                .locationDescription(request.getLocationDescription())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .damType(request.getDamType())
                .heightMeters(request.getHeightMeters())
                .lengthMeters(request.getLengthMeters())
                .reservoirCapacityMcm(request.getReservoirCapacityMcm())
                .grossStorageMcm(request.getGrossStorageMcm())
                .liveStorageMcm(request.getLiveStorageMcm())
                .deadStorageMcm(request.getDeadStorageMcm())
                .catchmentAreaSqkm(request.getCatchmentAreaSqkm())
                .spillwayCapacityCumecs(request.getSpillwayCapacityCumecs())
                .yearCompleted(request.getYearCompleted() != null ? Year.of(request.getYearCompleted()) : null)
                .riverName(request.getRiverName())
                .purpose(request.getPurpose())
                .operatorOrganization(request.getOperatorOrganization())
                .contactPhone(request.getContactPhone())
                .contactEmail(request.getContactEmail())
                .emergencyPhone(request.getEmergencyPhone())
                .overallHazardLevel(hazardLevel)
                .status(request.getStatus() != null ? request.getStatus() : Dam.DamStatus.operational)
                .riskClassification(request.getRiskClassification())
                .lastInspectionDate(request.getLastInspectionDate())
                .nextInspectionDate(request.getNextInspectionDate())
                .imageUrl(request.getImageUrl())
                .mapCenterLatitude(request.getMapCenterLatitude())
                .mapCenterLongitude(request.getMapCenterLongitude())
                .mapDefaultZoom(request.getMapDefaultZoom())
                .build();
    }
    
    public void updateDamFromRequest(Dam dam, UpdateDamRequest request, Region region, HazardLevel hazardLevel) {
        if (request.getCode() != null) dam.setCode(request.getCode());
        if (request.getName() != null) dam.setName(request.getName());
        if (request.getNameSi() != null) dam.setNameSi(request.getNameSi());
        if (request.getNameTa() != null) dam.setNameTa(request.getNameTa());
        if (region != null) dam.setRegion(region);
        if (request.getLocationDescription() != null) dam.setLocationDescription(request.getLocationDescription());
        if (request.getLatitude() != null) dam.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) dam.setLongitude(request.getLongitude());
        if (request.getDamType() != null) dam.setDamType(request.getDamType());
        if (request.getHeightMeters() != null) dam.setHeightMeters(request.getHeightMeters());
        if (request.getLengthMeters() != null) dam.setLengthMeters(request.getLengthMeters());
        if (request.getReservoirCapacityMcm() != null) dam.setReservoirCapacityMcm(request.getReservoirCapacityMcm());
        if (request.getGrossStorageMcm() != null) dam.setGrossStorageMcm(request.getGrossStorageMcm());
        if (request.getLiveStorageMcm() != null) dam.setLiveStorageMcm(request.getLiveStorageMcm());
        if (request.getDeadStorageMcm() != null) dam.setDeadStorageMcm(request.getDeadStorageMcm());
        if (request.getCatchmentAreaSqkm() != null) dam.setCatchmentAreaSqkm(request.getCatchmentAreaSqkm());
        if (request.getSpillwayCapacityCumecs() != null) dam.setSpillwayCapacityCumecs(request.getSpillwayCapacityCumecs());
        if (request.getYearCompleted() != null) dam.setYearCompleted(Year.of(request.getYearCompleted()));
        if (request.getRiverName() != null) dam.setRiverName(request.getRiverName());
        if (request.getPurpose() != null) dam.setPurpose(request.getPurpose());
        if (request.getOperatorOrganization() != null) dam.setOperatorOrganization(request.getOperatorOrganization());
        if (request.getContactPhone() != null) dam.setContactPhone(request.getContactPhone());
        if (request.getContactEmail() != null) dam.setContactEmail(request.getContactEmail());
        if (request.getEmergencyPhone() != null) dam.setEmergencyPhone(request.getEmergencyPhone());
        if (hazardLevel != null) dam.setOverallHazardLevel(hazardLevel);
        if (request.getStatus() != null) dam.setStatus(request.getStatus());
        if (request.getRiskClassification() != null) dam.setRiskClassification(request.getRiskClassification());
        if (request.getLastInspectionDate() != null) dam.setLastInspectionDate(request.getLastInspectionDate());
        if (request.getNextInspectionDate() != null) dam.setNextInspectionDate(request.getNextInspectionDate());
        if (request.getImageUrl() != null) dam.setImageUrl(request.getImageUrl());
        if (request.getMapCenterLatitude() != null) dam.setMapCenterLatitude(request.getMapCenterLatitude());
        if (request.getMapCenterLongitude() != null) dam.setMapCenterLongitude(request.getMapCenterLongitude());
        if (request.getMapDefaultZoom() != null) dam.setMapDefaultZoom(request.getMapDefaultZoom());
    }
    
    // ============== DAM CURRENT STATUS MAPPINGS ==============
    
    public DamCurrentStatusResponse toDamCurrentStatusResponse(DamCurrentStatus status) {
        if (status == null) return null;
        
        return DamCurrentStatusResponse.builder()
                .id(status.getId())
                .damId(status.getDam() != null ? status.getDam().getId() : null)
                .damName(status.getDam() != null ? status.getDam().getName() : null)
                .damCode(status.getDam() != null ? status.getDam().getCode() : null)
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
                .currentHazardLevel(toHazardLevelResponse(status.getCurrentHazardLevel()))
                .hazardStatus(status.getHazardStatus())
                .hazardValue(status.getHazardValue())
                .floodRiskScore(status.getFloodRiskScore())
                .activeHazardZones(status.getActiveHazardZones())
                .rainfallLast1hrMm(status.getRainfallLast1hrMm())
                .rainfallLast24hrMm(status.getRainfallLast24hrMm())
                .rainfallForecast24hrMm(status.getRainfallForecast24hrMm())
                .lastSensorReadingAt(status.getLastSensorReadingAt())
                .lastHazardAssessmentAt(status.getLastHazardAssessmentAt())
                .lastUpdated(status.getLastUpdated())
                .build();
    }
    
    public List<DamCurrentStatusResponse> toDamCurrentStatusResponseList(List<DamCurrentStatus> statuses) {
        return statuses.stream()
                .map(this::toDamCurrentStatusResponse)
                .collect(Collectors.toList());
    }
    
    public void updateDamCurrentStatusFromRequest(DamCurrentStatus status, UpdateDamStatusRequest request, HazardLevel hazardLevel) {
        if (request.getWaterLevelMeters() != null) status.setWaterLevelMeters(request.getWaterLevelMeters());
        if (request.getWaterLevelPercentage() != null) status.setWaterLevelPercentage(request.getWaterLevelPercentage());
        if (request.getInflowCumecs() != null) status.setInflowCumecs(request.getInflowCumecs());
        if (request.getOutflowCumecs() != null) status.setOutflowCumecs(request.getOutflowCumecs());
        if (request.getStorageCurrentMcm() != null) status.setStorageCurrentMcm(request.getStorageCurrentMcm());
        if (request.getStoragePercentage() != null) status.setStoragePercentage(request.getStoragePercentage());
        if (request.getSpillwayGateStatus() != null) status.setSpillwayGateStatus(request.getSpillwayGateStatus());
        if (request.getGatesOpenCount() != null) status.setGatesOpenCount(request.getGatesOpenCount());
        if (hazardLevel != null) status.setCurrentHazardLevel(hazardLevel);
        if (request.getHazardStatus() != null) status.setHazardStatus(request.getHazardStatus());
        if (request.getHazardValue() != null) status.setHazardValue(request.getHazardValue());
        if (request.getFloodRiskScore() != null) status.setFloodRiskScore(request.getFloodRiskScore());
        if (request.getRainfallLast1hrMm() != null) status.setRainfallLast1hrMm(request.getRainfallLast1hrMm());
        if (request.getRainfallLast24hrMm() != null) status.setRainfallLast24hrMm(request.getRainfallLast24hrMm());
        if (request.getRainfallForecast24hrMm() != null) status.setRainfallForecast24hrMm(request.getRainfallForecast24hrMm());
        status.setLastUpdated(LocalDateTime.now());
    }
    
    // ============== DAM HAZARD ZONE MAPPINGS ==============
    
    public DamHazardZoneResponse toDamHazardZoneResponse(DamHazardZone zone) {
        if (zone == null) return null;
        
        return DamHazardZoneResponse.builder()
                .id(zone.getId())
                .damId(zone.getDam() != null ? zone.getDam().getId() : null)
                .damName(zone.getDam() != null ? zone.getDam().getName() : null)
                .hazardLevel(toHazardLevelResponse(zone.getHazardLevel()))
                .zoneCode(zone.getZoneCode())
                .zoneName(zone.getZoneName())
                .zoneNameSi(zone.getZoneNameSi())
                .description(zone.getDescription())
                .descriptionSi(zone.getDescriptionSi())
                .boundaryGeojson(zone.getBoundaryGeojson())
                .centerLatitude(zone.getCenterLatitude())
                .centerLongitude(zone.getCenterLongitude())
                .areaSqKm(zone.getAreaSqKm())
                .perimeterKm(zone.getPerimeterKm())
                .distanceFromDamKm(zone.getDistanceFromDamKm())
                .estimatedFloodArrivalMinutes(zone.getEstimatedFloodArrivalMinutes())
                .estimatedWaterDepthMeters(zone.getEstimatedWaterDepthMeters())
                .floodVelocityMps(zone.getFloodVelocityMps())
                .fillColor(zone.getFillColor())
                .fillOpacity(zone.getFillOpacity())
                .strokeColor(zone.getStrokeColor())
                .strokeWidth(zone.getStrokeWidth())
                .displayOrder(zone.getDisplayOrder())
                .showLabel(zone.getShowLabel())
                .labelPosition(zone.getLabelPosition())
                .isActive(zone.getIsActive())
                .isVerified(zone.getIsVerified())
                .verifiedAt(zone.getVerifiedAt())
                .createdAt(zone.getCreatedAt())
                .build();
    }
    
    public List<DamHazardZoneResponse> toDamHazardZoneResponseList(List<DamHazardZone> zones) {
        return zones.stream()
                .map(this::toDamHazardZoneResponse)
                .collect(Collectors.toList());
    }
    
    public DamHazardZone toHazardZoneEntity(CreateHazardZoneRequest request, Dam dam, HazardLevel hazardLevel) {
        return DamHazardZone.builder()
                .dam(dam)
                .hazardLevel(hazardLevel)
                .zoneCode(request.getZoneCode())
                .zoneName(request.getZoneName())
                .zoneNameSi(request.getZoneNameSi())
                .description(request.getDescription())
                .descriptionSi(request.getDescriptionSi())
                .boundaryGeojson(request.getBoundaryGeojson())
                .centerLatitude(request.getCenterLatitude())
                .centerLongitude(request.getCenterLongitude())
                .areaSqKm(request.getAreaSqKm())
                .perimeterKm(request.getPerimeterKm())
                .distanceFromDamKm(request.getDistanceFromDamKm())
                .estimatedFloodArrivalMinutes(request.getEstimatedFloodArrivalMinutes())
                .estimatedWaterDepthMeters(request.getEstimatedWaterDepthMeters())
                .floodVelocityMps(request.getFloodVelocityMps())
                .fillColor(request.getFillColor())
                .fillOpacity(request.getFillOpacity())
                .strokeColor(request.getStrokeColor())
                .strokeWidth(request.getStrokeWidth())
                .displayOrder(request.getDisplayOrder())
                .showLabel(request.getShowLabel())
                .labelPosition(request.getLabelPosition())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .isVerified(false)
                .build();
    }
    
    public void updateHazardZoneFromRequest(DamHazardZone zone, UpdateHazardZoneRequest request, HazardLevel hazardLevel) {
        if (hazardLevel != null) zone.setHazardLevel(hazardLevel);
        if (request.getZoneCode() != null) zone.setZoneCode(request.getZoneCode());
        if (request.getZoneName() != null) zone.setZoneName(request.getZoneName());
        if (request.getZoneNameSi() != null) zone.setZoneNameSi(request.getZoneNameSi());
        if (request.getDescription() != null) zone.setDescription(request.getDescription());
        if (request.getDescriptionSi() != null) zone.setDescriptionSi(request.getDescriptionSi());
        if (request.getBoundaryGeojson() != null) zone.setBoundaryGeojson(request.getBoundaryGeojson());
        if (request.getCenterLatitude() != null) zone.setCenterLatitude(request.getCenterLatitude());
        if (request.getCenterLongitude() != null) zone.setCenterLongitude(request.getCenterLongitude());
        if (request.getAreaSqKm() != null) zone.setAreaSqKm(request.getAreaSqKm());
        if (request.getPerimeterKm() != null) zone.setPerimeterKm(request.getPerimeterKm());
        if (request.getDistanceFromDamKm() != null) zone.setDistanceFromDamKm(request.getDistanceFromDamKm());
        if (request.getEstimatedFloodArrivalMinutes() != null) zone.setEstimatedFloodArrivalMinutes(request.getEstimatedFloodArrivalMinutes());
        if (request.getEstimatedWaterDepthMeters() != null) zone.setEstimatedWaterDepthMeters(request.getEstimatedWaterDepthMeters());
        if (request.getFloodVelocityMps() != null) zone.setFloodVelocityMps(request.getFloodVelocityMps());
        if (request.getFillColor() != null) zone.setFillColor(request.getFillColor());
        if (request.getFillOpacity() != null) zone.setFillOpacity(request.getFillOpacity());
        if (request.getStrokeColor() != null) zone.setStrokeColor(request.getStrokeColor());
        if (request.getStrokeWidth() != null) zone.setStrokeWidth(request.getStrokeWidth());
        if (request.getDisplayOrder() != null) zone.setDisplayOrder(request.getDisplayOrder());
        if (request.getShowLabel() != null) zone.setShowLabel(request.getShowLabel());
        if (request.getLabelPosition() != null) zone.setLabelPosition(request.getLabelPosition());
        if (request.getIsActive() != null) zone.setIsActive(request.getIsActive());
        if (request.getIsVerified() != null) {
            zone.setIsVerified(request.getIsVerified());
            if (request.getIsVerified()) {
                zone.setVerifiedAt(LocalDateTime.now());
            }
        }
    }
    
    // ============== DAM GATE MAPPINGS ==============
    
    public DamGateResponse toDamGateResponse(DamGate gate) {
        if (gate == null) return null;
        
        return DamGateResponse.builder()
                .id(gate.getId())
                .damId(gate.getDam() != null ? gate.getDam().getId() : null)
                .damName(gate.getDam() != null ? gate.getDam().getName() : null)
                .gateNumber(gate.getGateNumber())
                .gateType(gate.getGateType())
                .latitude(gate.getLatitude())
                .longitude(gate.getLongitude())
                .maxOpeningMeters(gate.getMaxOpeningMeters())
                .currentOpeningMeters(gate.getCurrentOpeningMeters())
                .status(gate.getStatus())
                .lastOperationAt(gate.getLastOperationAt())
                .operatedBy(gate.getOperatedBy())
                .createdAt(gate.getCreatedAt())
                .updatedAt(gate.getUpdatedAt())
                .build();
    }
    
    public List<DamGateResponse> toDamGateResponseList(List<DamGate> gates) {
        return gates.stream()
                .map(this::toDamGateResponse)
                .collect(Collectors.toList());
    }
    
    public DamGate toDamGateEntity(CreateDamGateRequest request, Dam dam) {
        return DamGate.builder()
                .dam(dam)
                .gateNumber(request.getGateNumber())
                .gateType(request.getGateType())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .maxOpeningMeters(request.getMaxOpeningMeters())
                .currentOpeningMeters(request.getCurrentOpeningMeters() != null ? request.getCurrentOpeningMeters() : java.math.BigDecimal.ZERO)
                .status(request.getStatus() != null ? request.getStatus() : DamGate.GateStatus.closed)
                .build();
    }
    
    public void updateDamGateFromRequest(DamGate gate, UpdateDamGateRequest request) {
        if (request.getGateNumber() != null) gate.setGateNumber(request.getGateNumber());
        if (request.getGateType() != null) gate.setGateType(request.getGateType());
        if (request.getLatitude() != null) gate.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) gate.setLongitude(request.getLongitude());
        if (request.getMaxOpeningMeters() != null) gate.setMaxOpeningMeters(request.getMaxOpeningMeters());
        if (request.getCurrentOpeningMeters() != null) gate.setCurrentOpeningMeters(request.getCurrentOpeningMeters());
        if (request.getStatus() != null) gate.setStatus(request.getStatus());
    }
    
    // ============== SENSOR TYPE MAPPINGS ==============
    
    public SensorTypeResponse toSensorTypeResponse(SensorType sensorType) {
        if (sensorType == null) return null;
        
        return SensorTypeResponse.builder()
                .id(sensorType.getId())
                .code(sensorType.getCode())
                .name(sensorType.getName())
                .description(sensorType.getDescription())
                .unit(sensorType.getUnit())
                .minThreshold(sensorType.getMinThreshold())
                .maxThreshold(sensorType.getMaxThreshold())
                .criticalThreshold(sensorType.getCriticalThreshold())
                .icon(sensorType.getIcon())
                .createdAt(sensorType.getCreatedAt())
                .build();
    }
    
    public List<SensorTypeResponse> toSensorTypeResponseList(List<SensorType> sensorTypes) {
        return sensorTypes.stream()
                .map(this::toSensorTypeResponse)
                .collect(Collectors.toList());
    }
    
    // ============== SENSOR MAPPINGS ==============
    
    public SensorResponse toSensorResponse(Sensor sensor) {
        if (sensor == null) return null;
        
        return SensorResponse.builder()
                .id(sensor.getId())
                .sensorUid(sensor.getSensorUid())
                .damId(sensor.getDam() != null ? sensor.getDam().getId() : null)
                .damName(sensor.getDam() != null ? sensor.getDam().getName() : null)
                .sensorType(toSensorTypeResponse(sensor.getSensorType()))
                .name(sensor.getName())
                .description(sensor.getDescription())
                .locationOnDam(sensor.getLocationOnDam())
                .latitude(sensor.getLatitude())
                .longitude(sensor.getLongitude())
                .elevationMeters(sensor.getElevationMeters())
                .manufacturer(sensor.getManufacturer())
                .model(sensor.getModel())
                .serialNumber(sensor.getSerialNumber())
                .installationDate(sensor.getInstallationDate())
                .calibrationDate(sensor.getCalibrationDate())
                .nextCalibrationDate(sensor.getNextCalibrationDate())
                .minReading(sensor.getMinReading())
                .maxReading(sensor.getMaxReading())
                .warningThreshold(sensor.getWarningThreshold())
                .criticalThreshold(sensor.getCriticalThreshold())
                .readingIntervalSeconds(sensor.getReadingIntervalSeconds())
                .status(sensor.getStatus())
                .lastReadingAt(sensor.getLastReadingAt())
                .batteryLevel(sensor.getBatteryLevel())
                .signalStrength(sensor.getSignalStrength())
                .createdAt(sensor.getCreatedAt())
                .build();
    }
    
    public List<SensorResponse> toSensorResponseList(List<Sensor> sensors) {
        return sensors.stream()
                .map(this::toSensorResponse)
                .collect(Collectors.toList());
    }
    
    public Sensor toSensorEntity(CreateSensorRequest request, Dam dam, SensorType sensorType) {
        return Sensor.builder()
                .sensorUid(request.getSensorUid())
                .dam(dam)
                .sensorType(sensorType)
                .name(request.getName())
                .description(request.getDescription())
                .locationOnDam(request.getLocationOnDam())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .elevationMeters(request.getElevationMeters())
                .manufacturer(request.getManufacturer())
                .model(request.getModel())
                .serialNumber(request.getSerialNumber())
                .installationDate(request.getInstallationDate())
                .calibrationDate(request.getCalibrationDate())
                .nextCalibrationDate(request.getNextCalibrationDate())
                .minReading(request.getMinReading())
                .maxReading(request.getMaxReading())
                .warningThreshold(request.getWarningThreshold())
                .criticalThreshold(request.getCriticalThreshold())
                .readingIntervalSeconds(request.getReadingIntervalSeconds())
                .status(request.getStatus() != null ? request.getStatus() : Sensor.SensorStatus.active)
                .build();
    }
    
    public void updateSensorFromRequest(Sensor sensor, UpdateSensorRequest request, SensorType sensorType) {
        if (request.getSensorUid() != null) sensor.setSensorUid(request.getSensorUid());
        if (sensorType != null) sensor.setSensorType(sensorType);
        if (request.getName() != null) sensor.setName(request.getName());
        if (request.getDescription() != null) sensor.setDescription(request.getDescription());
        if (request.getLocationOnDam() != null) sensor.setLocationOnDam(request.getLocationOnDam());
        if (request.getLatitude() != null) sensor.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) sensor.setLongitude(request.getLongitude());
        if (request.getElevationMeters() != null) sensor.setElevationMeters(request.getElevationMeters());
        if (request.getManufacturer() != null) sensor.setManufacturer(request.getManufacturer());
        if (request.getModel() != null) sensor.setModel(request.getModel());
        if (request.getSerialNumber() != null) sensor.setSerialNumber(request.getSerialNumber());
        if (request.getInstallationDate() != null) sensor.setInstallationDate(request.getInstallationDate());
        if (request.getCalibrationDate() != null) sensor.setCalibrationDate(request.getCalibrationDate());
        if (request.getNextCalibrationDate() != null) sensor.setNextCalibrationDate(request.getNextCalibrationDate());
        if (request.getMinReading() != null) sensor.setMinReading(request.getMinReading());
        if (request.getMaxReading() != null) sensor.setMaxReading(request.getMaxReading());
        if (request.getWarningThreshold() != null) sensor.setWarningThreshold(request.getWarningThreshold());
        if (request.getCriticalThreshold() != null) sensor.setCriticalThreshold(request.getCriticalThreshold());
        if (request.getReadingIntervalSeconds() != null) sensor.setReadingIntervalSeconds(request.getReadingIntervalSeconds());
        if (request.getStatus() != null) sensor.setStatus(request.getStatus());
        if (request.getBatteryLevel() != null) sensor.setBatteryLevel(request.getBatteryLevel());
        if (request.getSignalStrength() != null) sensor.setSignalStrength(request.getSignalStrength());
    }
    
    // ============== SENSOR READING MAPPINGS ==============
    
    public SensorReadingResponse toSensorReadingResponse(SensorReading reading) {
        if (reading == null) return null;
        
        return SensorReadingResponse.builder()
                .id(reading.getId())
                .sensorId(reading.getSensor() != null ? reading.getSensor().getId() : null)
                .sensorName(reading.getSensor() != null ? reading.getSensor().getName() : null)
                .damId(reading.getSensor() != null && reading.getSensor().getDam() != null ? reading.getSensor().getDam().getId() : null)
                .readingValue(reading.getReadingValue())
                .unit(reading.getUnit())
                .quality(reading.getQuality())
                .recordedAt(reading.getRecordedAt())
                .receivedAt(reading.getReceivedAt())
                .build();
    }
    
    public List<SensorReadingResponse> toSensorReadingResponseList(List<SensorReading> readings) {
        return readings.stream()
                .map(this::toSensorReadingResponse)
                .collect(Collectors.toList());
    }
    
    public SensorReading toSensorReadingEntity(CreateSensorReadingRequest request, Sensor sensor) {
        return SensorReading.builder()
                .sensor(sensor)
                .dam(sensor.getDam())
                .readingValue(request.getReadingValue())
                .unit(request.getUnit() != null ? request.getUnit() : sensor.getSensorType().getUnit())
                .quality(request.getQuality() != null ? request.getQuality() : SensorReading.ReadingQuality.good)
                .recordedAt(request.getRecordedAt() != null ? request.getRecordedAt() : LocalDateTime.now())
                .build();
    }
}
