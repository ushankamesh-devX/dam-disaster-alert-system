package com.ddas.api.dto.request.news;

import lombok.Data;

@Data
public class UpdateNewsCategoryRequest {
    private String name;
    private String nameSi;
    private String nameTa;
    private String description;
    private String icon;
    private String color;
    private Integer displayOrder;
    private Boolean isActive;
}
