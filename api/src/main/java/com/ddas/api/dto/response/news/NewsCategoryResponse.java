package com.ddas.api.dto.response.news;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class NewsCategoryResponse {
    private Long id;
    private String code;
    private String name;
    private String nameSi;
    private String nameTa;
    private String description;
    private String icon;
    private String color;
    private String filterKey;
    private Integer displayOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
