package com.ddas.api.dto.response.news;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NewsArticleResponse {
    private Long id;
    private String uuid;
    private Long categoryId;
    private String categoryName;
    private String categoryIcon;
    private String categoryColor;

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
    private String regionName;
    private Long damId;
    private String damName;

    private String status;
    private Boolean isFeatured;
    private LocalDateTime publishDate;
    private LocalDateTime expiryDate;

    private Integer viewCount;
    private Integer saveCount;
    private Integer shareCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
