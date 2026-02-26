package com.ddas.api.mapper;

import com.ddas.api.dto.request.CreateSystemSafeLocationRequest;
import com.ddas.api.dto.request.UpdateSystemSafeLocationRequest;
import com.ddas.api.dto.request.UpsertSystemSafeLocationRequest;
import com.ddas.api.dto.response.SystemSafeLocationResponse;
import com.ddas.api.entity.SystemSafeLocation;
import org.springframework.stereotype.Component;

@Component
public class SystemSafeLocationMapper {

    public SystemSafeLocationResponse toResponse(SystemSafeLocation e) {
        if (e == null) return null;

        return SystemSafeLocationResponse.builder()
                .id(e.getId())
                .uuid(e.getUuid())
                .code(e.getCode())
                .name(e.getName())
                .nameSi(e.getNameSi())
                .nameTa(e.getNameTa())
                .description(e.getDescription())
                .descriptionSi(e.getDescriptionSi())
                .locationTypeId(e.getLocationTypeId())
                .regionId(e.getRegionId())
                .addressText(e.getAddressText())
                .addressSi(e.getAddressSi())
                .latitude(e.getLatitude())
                .longitude(e.getLongitude())
                .elevationMeters(e.getElevationMeters())
                .boundaryGeojson(e.getBoundaryGeojson())
                .capacityPersons(e.getCapacityPersons())
                .currentOccupancy(e.getCurrentOccupancy())
                .hasMedicalFacility(e.getHasMedicalFacility())
                .hasFoodSupply(e.getHasFoodSupply())
                .hasWaterSupply(e.getHasWaterSupply())
                .hasPowerBackup(e.getHasPowerBackup())
                .hasCommunication(e.getHasCommunication())
                .hasRestrooms(e.getHasRestrooms())
                .hasPetArea(e.getHasPetArea())
                .hasAccessibility(e.getHasAccessibility())
                .amenities(e.getAmenities())
                .contactName(e.getContactName())
                .contactPhone(e.getContactPhone())
                .contactEmail(e.getContactEmail())
                .emergencyPhone(e.getEmergencyPhone())
                .operatingHours(e.getOperatingHours())
                .is24Hours(e.getIs24Hours())
                .primaryDamId(e.getPrimaryDamId())
                .servesHazardZones(e.getServesHazardZones())
                .distanceFromDamKm(e.getDistanceFromDamKm())
                .estimatedTravelTimeMinutes(e.getEstimatedTravelTimeMinutes())
                .status(e.getStatus() != null ? e.getStatus().name() : null)
                .isVerified(e.getIsVerified())
                .verifiedBy(e.getVerifiedBy())
                .verifiedAt(e.getVerifiedAt())
                .lastInspectionDate(e.getLastInspectionDate())
                .nextInspectionDate(e.getNextInspectionDate())
                .showOnMap(e.getShowOnMap())
                .markerIcon(e.getMarkerIcon())
                .markerColor(e.getMarkerColor())
                .imageUrl(e.getImageUrl())
                .galleryUrls(e.getGalleryUrls())
                .createdBy(e.getCreatedBy())
                .updatedBy(e.getUpdatedBy())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .deletedAt(e.getDeletedAt())
                .build();
    }

    public SystemSafeLocation toEntity(CreateSystemSafeLocationRequest r) {
        if (r == null) return null;

        return SystemSafeLocation.builder()
                .uuid(r.getUuid())
                .code(r.getCode())
                .name(r.getName())
                .nameSi(r.getNameSi())
                .nameTa(r.getNameTa())
                .description(r.getDescription())
                .descriptionSi(r.getDescriptionSi())
                .locationTypeId(r.getLocationTypeId())
                .regionId(r.getRegionId())
                .addressText(r.getAddressText())
                .addressSi(r.getAddressSi())
                .latitude(r.getLatitude())
                .longitude(r.getLongitude())
                .elevationMeters(r.getElevationMeters())
                .boundaryGeojson(r.getBoundaryGeojson())
                .capacityPersons(r.getCapacityPersons())
                .currentOccupancy(r.getCurrentOccupancy() != null ? r.getCurrentOccupancy() : 0)
                .hasMedicalFacility(Boolean.TRUE.equals(r.getHasMedicalFacility()))
                .hasFoodSupply(Boolean.TRUE.equals(r.getHasFoodSupply()))
                .hasWaterSupply(Boolean.TRUE.equals(r.getHasWaterSupply()))
                .hasPowerBackup(Boolean.TRUE.equals(r.getHasPowerBackup()))
                .hasCommunication(Boolean.TRUE.equals(r.getHasCommunication()))
                .hasRestrooms(Boolean.TRUE.equals(r.getHasRestrooms()))
                .hasPetArea(Boolean.TRUE.equals(r.getHasPetArea()))
                .hasAccessibility(Boolean.TRUE.equals(r.getHasAccessibility()))
                .amenities(r.getAmenities())
                .contactName(r.getContactName())
                .contactPhone(r.getContactPhone())
                .contactEmail(r.getContactEmail())
                .emergencyPhone(r.getEmergencyPhone())
                .operatingHours(r.getOperatingHours())
                .is24Hours(Boolean.TRUE.equals(r.getIs24Hours()))
                .primaryDamId(r.getPrimaryDamId())
                .servesHazardZones(r.getServesHazardZones())
                .distanceFromDamKm(r.getDistanceFromDamKm())
                .estimatedTravelTimeMinutes(r.getEstimatedTravelTimeMinutes())
                .status(parseStatus(r.getStatus()))
                .isVerified(Boolean.TRUE.equals(r.getIsVerified()))
                .verifiedBy(r.getVerifiedBy())
                .verifiedAt(r.getVerifiedAt())
                .lastInspectionDate(r.getLastInspectionDate())
                .nextInspectionDate(r.getNextInspectionDate())
                .showOnMap(r.getShowOnMap() != null ? r.getShowOnMap() : true)
                .markerIcon(r.getMarkerIcon())
                .markerColor(r.getMarkerColor())
                .imageUrl(r.getImageUrl())
                .galleryUrls(r.getGalleryUrls())
                .createdBy(r.getCreatedBy())
                .updatedBy(r.getUpdatedBy())
                .build();
    }

    public void updateFromRequest(SystemSafeLocation e, UpdateSystemSafeLocationRequest r) {
        if (e == null || r == null) return;

        if (r.getCode() != null) e.setCode(r.getCode());
        if (r.getName() != null) e.setName(r.getName());
        if (r.getNameSi() != null) e.setNameSi(r.getNameSi());
        if (r.getNameTa() != null) e.setNameTa(r.getNameTa());
        if (r.getDescription() != null) e.setDescription(r.getDescription());
        if (r.getDescriptionSi() != null) e.setDescriptionSi(r.getDescriptionSi());
        if (r.getLocationTypeId() != null) e.setLocationTypeId(r.getLocationTypeId());
        if (r.getRegionId() != null) e.setRegionId(r.getRegionId());
        if (r.getAddressText() != null) e.setAddressText(r.getAddressText());
        if (r.getAddressSi() != null) e.setAddressSi(r.getAddressSi());
        if (r.getLatitude() != null) e.setLatitude(r.getLatitude());
        if (r.getLongitude() != null) e.setLongitude(r.getLongitude());
        if (r.getElevationMeters() != null) e.setElevationMeters(r.getElevationMeters());
        if (r.getBoundaryGeojson() != null) e.setBoundaryGeojson(r.getBoundaryGeojson());
        if (r.getCapacityPersons() != null) e.setCapacityPersons(r.getCapacityPersons());
        if (r.getCurrentOccupancy() != null) e.setCurrentOccupancy(r.getCurrentOccupancy());
        if (r.getHasMedicalFacility() != null) e.setHasMedicalFacility(r.getHasMedicalFacility());
        if (r.getHasFoodSupply() != null) e.setHasFoodSupply(r.getHasFoodSupply());
        if (r.getHasWaterSupply() != null) e.setHasWaterSupply(r.getHasWaterSupply());
        if (r.getHasPowerBackup() != null) e.setHasPowerBackup(r.getHasPowerBackup());
        if (r.getHasCommunication() != null) e.setHasCommunication(r.getHasCommunication());
        if (r.getHasRestrooms() != null) e.setHasRestrooms(r.getHasRestrooms());
        if (r.getHasPetArea() != null) e.setHasPetArea(r.getHasPetArea());
        if (r.getHasAccessibility() != null) e.setHasAccessibility(r.getHasAccessibility());
        if (r.getAmenities() != null) e.setAmenities(r.getAmenities());
        if (r.getContactName() != null) e.setContactName(r.getContactName());
        if (r.getContactPhone() != null) e.setContactPhone(r.getContactPhone());
        if (r.getContactEmail() != null) e.setContactEmail(r.getContactEmail());
        if (r.getEmergencyPhone() != null) e.setEmergencyPhone(r.getEmergencyPhone());
        if (r.getOperatingHours() != null) e.setOperatingHours(r.getOperatingHours());
        if (r.getIs24Hours() != null) e.setIs24Hours(r.getIs24Hours());
        if (r.getPrimaryDamId() != null) e.setPrimaryDamId(r.getPrimaryDamId());
        if (r.getServesHazardZones() != null) e.setServesHazardZones(r.getServesHazardZones());
        if (r.getDistanceFromDamKm() != null) e.setDistanceFromDamKm(r.getDistanceFromDamKm());
        if (r.getEstimatedTravelTimeMinutes() != null) e.setEstimatedTravelTimeMinutes(r.getEstimatedTravelTimeMinutes());
        if (r.getStatus() != null) e.setStatus(parseStatus(r.getStatus()));
        if (r.getIsVerified() != null) e.setIsVerified(r.getIsVerified());
        if (r.getVerifiedBy() != null) e.setVerifiedBy(r.getVerifiedBy());
        if (r.getVerifiedAt() != null) e.setVerifiedAt(r.getVerifiedAt());
        if (r.getLastInspectionDate() != null) e.setLastInspectionDate(r.getLastInspectionDate());
        if (r.getNextInspectionDate() != null) e.setNextInspectionDate(r.getNextInspectionDate());
        if (r.getShowOnMap() != null) e.setShowOnMap(r.getShowOnMap());
        if (r.getMarkerIcon() != null) e.setMarkerIcon(r.getMarkerIcon());
        if (r.getMarkerColor() != null) e.setMarkerColor(r.getMarkerColor());
        if (r.getImageUrl() != null) e.setImageUrl(r.getImageUrl());
        if (r.getGalleryUrls() != null) e.setGalleryUrls(r.getGalleryUrls());
        if (r.getUpdatedBy() != null) e.setUpdatedBy(r.getUpdatedBy());
    }

    public void applyUpsert(SystemSafeLocation e, UpsertSystemSafeLocationRequest r) {
        if (e == null || r == null) return;

        e.setUuid(r.getUuid());
        e.setCode(r.getCode());
        e.setName(r.getName());
        e.setNameSi(r.getNameSi());
        e.setNameTa(r.getNameTa());
        e.setDescription(r.getDescription());
        e.setDescriptionSi(r.getDescriptionSi());
        e.setLocationTypeId(r.getLocationTypeId());
        e.setRegionId(r.getRegionId());
        e.setAddressText(r.getAddressText());
        e.setAddressSi(r.getAddressSi());
        e.setLatitude(r.getLatitude());
        e.setLongitude(r.getLongitude());
        e.setElevationMeters(r.getElevationMeters());
        e.setBoundaryGeojson(r.getBoundaryGeojson());
        e.setCapacityPersons(r.getCapacityPersons());
        e.setCurrentOccupancy(r.getCurrentOccupancy() != null ? r.getCurrentOccupancy() : 0);
        e.setHasMedicalFacility(r.getHasMedicalFacility() != null ? r.getHasMedicalFacility() : false);
        e.setHasFoodSupply(r.getHasFoodSupply() != null ? r.getHasFoodSupply() : false);
        e.setHasWaterSupply(r.getHasWaterSupply() != null ? r.getHasWaterSupply() : false);
        e.setHasPowerBackup(r.getHasPowerBackup() != null ? r.getHasPowerBackup() : false);
        e.setHasCommunication(r.getHasCommunication() != null ? r.getHasCommunication() : false);
        e.setHasRestrooms(r.getHasRestrooms() != null ? r.getHasRestrooms() : false);
        e.setHasPetArea(r.getHasPetArea() != null ? r.getHasPetArea() : false);
        e.setHasAccessibility(r.getHasAccessibility() != null ? r.getHasAccessibility() : false);
        e.setAmenities(r.getAmenities());
        e.setContactName(r.getContactName());
        e.setContactPhone(r.getContactPhone());
        e.setContactEmail(r.getContactEmail());
        e.setEmergencyPhone(r.getEmergencyPhone());
        e.setOperatingHours(r.getOperatingHours());
        e.setIs24Hours(r.getIs24Hours() != null ? r.getIs24Hours() : false);
        e.setPrimaryDamId(r.getPrimaryDamId());
        e.setServesHazardZones(r.getServesHazardZones());
        e.setDistanceFromDamKm(r.getDistanceFromDamKm());
        e.setEstimatedTravelTimeMinutes(r.getEstimatedTravelTimeMinutes());
        e.setStatus(parseStatus(r.getStatus()));
        e.setIsVerified(r.getIsVerified() != null ? r.getIsVerified() : false);
        e.setVerifiedBy(r.getVerifiedBy());
        e.setVerifiedAt(r.getVerifiedAt());
        e.setLastInspectionDate(r.getLastInspectionDate());
        e.setNextInspectionDate(r.getNextInspectionDate());
        e.setShowOnMap(r.getShowOnMap() != null ? r.getShowOnMap() : true);
        e.setMarkerIcon(r.getMarkerIcon());
        e.setMarkerColor(r.getMarkerColor());
        e.setImageUrl(r.getImageUrl());
        e.setGalleryUrls(r.getGalleryUrls());
        if (r.getCreatedBy() != null) e.setCreatedBy(r.getCreatedBy());
        if (r.getUpdatedBy() != null) e.setUpdatedBy(r.getUpdatedBy());

        // If it was previously soft-deleted, resurrect it on upsert.
        e.setDeletedAt(null);
    }

    private SystemSafeLocation.Status parseStatus(String status) {
        if (status == null || status.isBlank()) return SystemSafeLocation.Status.active;
        try {
            return SystemSafeLocation.Status.valueOf(status.trim());
        } catch (IllegalArgumentException ex) {
            return SystemSafeLocation.Status.active;
        }
    }
}
