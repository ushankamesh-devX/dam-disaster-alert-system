package com.ddas.api.dto.response.report;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ReportTypeResponse {
    private Long id;
    private String code;
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
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
