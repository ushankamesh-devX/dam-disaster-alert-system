package com.ddas.api.dto.request.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateReportTypeRequest {

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

