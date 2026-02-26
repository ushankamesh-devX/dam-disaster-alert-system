package com.ddas.api.dto.request.news;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ArticleShareRequest {
    @NotNull(message = "User ID is required")
    private Long userId;

    /** whatsapp | facebook | copy_link | twitter | etc. */
    private String platform;
}
