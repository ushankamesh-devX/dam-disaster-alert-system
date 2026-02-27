package com.ddas.api.dto.response;

import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AlertResponseDTO {

    private Long id;
    private String uuid;
    private Long alertTypeId;
    private String alertTypeName;
    private String title;
    private String message;
    private AlertType.AlertSeverity severity;
    private Alert.AlertStatus status;
    private Long damId;
    private Long regionId;
    private boolean simulationMode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
