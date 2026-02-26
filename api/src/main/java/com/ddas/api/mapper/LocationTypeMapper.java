package com.ddas.api.mapper;

import com.ddas.api.dto.response.LocationTypeResponse;
import com.ddas.api.entity.LocationType;

public class LocationTypeMapper {

    private LocationTypeMapper() {
    }

    public static LocationTypeResponse toResponse(LocationType e) {
        if (e == null) return null;
        return LocationTypeResponse.builder()
                .id(e.getId())
                .code(e.getCode())
                .name(e.getName())
                .nameSi(e.getNameSi())
                .nameTa(e.getNameTa())
                .category(e.getCategory())
                .markerColor(e.getMarkerColor())
                .markerIcon(e.getMarkerIcon())
                .isEvacuationPoint(e.getIsEvacuationPoint())
                .isActive(e.getIsActive())
                .displayOrder(e.getDisplayOrder())
                .build();
    }
}
