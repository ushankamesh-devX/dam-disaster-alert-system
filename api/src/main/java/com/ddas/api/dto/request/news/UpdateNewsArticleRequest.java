package com.ddas.api.dto.request.news;

import lombok.Data;

@Data
public class UpdateNewsArticleRequest {
    private Long categoryId;
    private String title;
    private String titleSi;
    private String titleTa;
    private String summary;
    private String summarySi;
    private String content;
    private String contentSi;
    private String imageUrl;
    private String imageAlt;
    private String galleryUrls;
    private String priorityLevel;
    private String source;
    private Boolean isNationwide;
    private Long regionId;
    private Long damId;
    private String status;
    private Boolean isFeatured;
}
