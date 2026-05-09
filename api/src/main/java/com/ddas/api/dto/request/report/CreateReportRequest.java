package com.ddas.api.dto.request.report;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateReportRequest {

    @NotNull(message = "Report type ID is required")
    private Long reportTypeId;

    private Long damId;

    private Long regionId;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private String locationDescription;

    private String locationDescriptionSi;

    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    private String descriptionSi;

    private String priority; // low, medium, high, critical

    private Boolean isAnonymous;

    @Valid
    private List<MediaItemRequest> media;

    private String metadata; // JSON string
}
