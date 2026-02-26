package com.ddas.api.dto.request.news;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateNewsCategoryRequest {
    @NotBlank(message = "Code is required")
    private String code;

    @NotBlank(message = "Name is required")
    private String name;

    private String nameSi;
    private String nameTa;
    private String description;
    private String icon;
    private String color;

    @NotBlank(message = "Filter key is required")
    private String filterKey;

    private Integer displayOrder = 0;

    @NotNull(message = "Is Active is required")
    private Boolean isActive = true;
}
