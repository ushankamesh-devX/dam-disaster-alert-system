package com.ddas.api.dto.request;

import com.ddas.api.entity.AlertType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AlertTypeRequestDTO {

    @NotBlank(message = "code is required")
    @Size(max = 50)
    private String code;

    @NotBlank(message = "name is required")
    @Size(max = 100)
    private String name;

    private String nameSi;
    private String nameTa;

    private String description;

    @NotNull(message = "category is required")
    private AlertType.AlertCategory category;

    @NotNull(message = "severity is required")
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

    private boolean active = true;
    private Integer displayOrder = 0;
}
