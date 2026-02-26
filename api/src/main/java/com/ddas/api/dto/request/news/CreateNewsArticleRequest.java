package com.ddas.api.dto.request.news;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateNewsArticleRequest {
    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @NotBlank(message = "Title is required")
    private String title;
    private String titleSi;
    private String titleTa;

    @NotBlank(message = "Summary is required")
    private String summary;
    private String summarySi;

    @NotBlank(message = "Content is required")
    private String content;
    private String contentSi;

    private String imageUrl;
    private String imageAlt;
    private String galleryUrls;
    private String priorityLevel = "medium";
    private String source;
    private Boolean isNationwide = false;
    private Long regionId;
    private Long damId;
    private String status = "draft";
    private Boolean isFeatured = false;
}
