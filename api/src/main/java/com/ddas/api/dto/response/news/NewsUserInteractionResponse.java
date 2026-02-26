package com.ddas.api.dto.response.news;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class NewsUserInteractionResponse {
    private Long id;
    private Long userId;
    private Long articleId;
    private String articleTitle;
    private Boolean hasViewed;
    private Boolean hasSaved;
    private Boolean hasShared;
    private LocalDateTime viewedAt;
    private LocalDateTime savedAt;
    private Integer readProgress;
    private Integer readTimeSeconds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
