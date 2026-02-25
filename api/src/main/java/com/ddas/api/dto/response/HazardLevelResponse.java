package com.ddas.api.dto.response;

import com.ddas.api.entity.HazardLevel;
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
public class HazardLevelResponse {
    private Long id;
    private Integer levelNumber;
    private String code;
    private String name;
    private String nameSi;
    private String description;
    private String descriptionSi;
    private String color;
    private BigDecimal fillOpacity;
    private String strokeColor;
    private Integer strokeWidth;
    private String icon;
    private BigDecimal riskScoreMin;
    private BigDecimal riskScoreMax;
    private Boolean evacuationRequired;
    private HazardLevel.NotificationPriority notificationPriority;
    private Integer estimatedFloodTimeMinutes;
    private Boolean isActive;
    private Integer displayOrder;
    private LocalDateTime createdAt;
}
