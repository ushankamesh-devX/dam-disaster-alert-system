package com.ddas.api.dto.response.news;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class NewsPushLogResponse {
    private Long id;
    private Long articleId;
    private String articleTitle;
    private Integer totalRecipients;
    private Integer sentCount;
    private Integer deliveredCount;
    private Integer failedCount;
    private Integer openedCount;
    private String provider;
    private String batchId;
    private LocalDateTime sentAt;
    private LocalDateTime completedAt;
}
