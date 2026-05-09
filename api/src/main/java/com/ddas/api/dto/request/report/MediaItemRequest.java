package com.ddas.api.dto.request.report;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class MediaItemRequest {

    @NotBlank(message = "File name is required")
    private String fileName;

    @NotBlank(message = "File path is required")
    private String filePath;

    private String fileUrl;

    @NotNull(message = "File type is required")
    private String fileType; // image, video, document

    private String mimeType;

    private Long fileSizeBytes;

    private Integer width;

    private Integer height;

    private Integer durationSeconds;

    private String thumbnailUrl;

    private BigDecimal latitude;

    private BigDecimal longitude;

    private LocalDateTime capturedAt;

    private String caption;

    private Boolean isPrimary;
}
