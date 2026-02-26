package com.ddas.api.dto.request.news;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ArticleSaveRequest {
    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Has saved flag is required")
    private Boolean hasSaved;
}
