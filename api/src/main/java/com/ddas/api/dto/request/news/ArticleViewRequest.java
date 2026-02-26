package com.ddas.api.dto.request.news;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ArticleViewRequest {
    @NotNull(message = "User ID is required")
    private Long userId;

    private Integer readProgress;

    private Integer readTimeSeconds;
}
