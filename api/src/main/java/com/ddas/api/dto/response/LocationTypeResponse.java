package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationTypeResponse {
    private Long id;
    private String code;
    private String name;
    private String nameSi;
    private String nameTa;
    private String category;
    private String markerColor;
    private String markerIcon;
    private Boolean isEvacuationPoint;
    private Boolean isActive;
    private Integer displayOrder;
}
