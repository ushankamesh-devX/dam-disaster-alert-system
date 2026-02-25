package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegionResponse {
    private Long id;
    private String name;
    private String nameSi;
    private String nameTa;
    private String stateProvince;
    private String country;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String boundaryGeojson;
    private LocalDateTime createdAt;
}
