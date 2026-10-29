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
public class MlDamMetadataResponse {
    private Long id;
    private String code;
    private String name;
    private String nameSi;
    private String nameTa;
    private Long regionId;
    private String regionName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String damType;
    private BigDecimal heightMeters;
    private BigDecimal lengthMeters;
    private BigDecimal reservoirCapacityMcm;
    private BigDecimal grossStorageMcm;
    private BigDecimal liveStorageMcm;
    private BigDecimal deadStorageMcm;
    private BigDecimal catchmentAreaSqkm;
    private BigDecimal spillwayCapacityCumecs;
    private String riverName;
    private String status;
    private String riskClassification;
    private Boolean isMlEnabled;
}

