package com.ddas.api.dto.response.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportMediaResponse {

    private Long id;
    private String uuid;
    private String fileName;
    private String mediaUrl;
    private String mediaType;
    private String mimeType;
    private Long fileSizeBytes;
    private Integer width;
    private Integer height;
    private LocalDateTime createdAt;
}

