package com.ddas.api.dto.response;

import com.ddas.api.entity.AlertType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AlertTypeResponseDTO {

    private Long id;
    private String code;
    private String name;
    private String nameSi;
    private String nameTa;
    private String description;

    private AlertType.AlertCategory category;
    private AlertType.AlertSeverity severity;

    private String icon;
    private String color;
    private String sound;

    private boolean acknowledgmentRequired;
    private Integer autoExpireHours;

    private String titleTemplate;
    private String titleTemplateSi;
    private String bodyTemplate;
    private String bodyTemplateSi;

    private boolean active;
    private Integer displayOrder;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
