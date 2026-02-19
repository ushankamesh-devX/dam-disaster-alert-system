package com.ddas.api.dto.response;

import com.ddas.api.entity.Dam;
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
public class DamListResponse {
    private Long id;
    private String code;
    private String name;
    private String nameSi;
    private String regionName;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private Dam.DamType damType;
    private Dam.HazardStatus overallHazardStatus;
    private Dam.DamStatus status;
    private Dam.RiskClassification riskClassification;
    private String imageUrl;
    private LocalDateTime updatedAt;
}
