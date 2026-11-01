package com.ddas.api.dto.request.news;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

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

    /** Optional direct local binary file upload from PC/mobile */
    @JsonIgnore
    private MultipartFile file;
}
