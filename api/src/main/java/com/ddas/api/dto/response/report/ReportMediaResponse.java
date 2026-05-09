package com.ddas.api.dto.response.report;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class ReportMediaResponse {
    private Long id;
    private String uuid;
    private String fileName;
    private String filePath;
    private String fileUrl;
    private String fileType;
    private String mimeType;
    private Long fileSizeBytes;
    private Integer width;
    private Integer height;
    private Integer durationSeconds;
    private String thumbnailUrl;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private LocalDateTime capturedAt;
    private Integer displayOrder;
    private String caption;
    private Boolean isPrimary;
    private Long uploadedById;
    private LocalDateTime createdAt;
}
