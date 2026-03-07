package com.ddas.api.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AlertPageResponseDTO {
    private List<AlertResponseDTO> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
}
