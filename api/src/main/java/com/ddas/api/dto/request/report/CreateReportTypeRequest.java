package com.ddas.api.dto.request.report;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReportTypeRequest {

    @NotBlank(message = "Code is required")
    private String code;

    @NotBlank(message = "Name is required")
    private String name;

    private String nameSi;
    private String nameTa;
    private String description;
    private String icon;
    private String color;
    private String category;
    private String defaultPriority;
    private Boolean requiresPhoto;
    private Boolean requiresLocation;
    private Integer autoAlertThreshold;
    private Boolean isActive;
    private Integer displayOrder;
}

